"""
Category Generation Service - Analyzes line sheets and generates product categories using LLM.
"""
import logging
import re
import tempfile
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from .firebase_service import firebase_service
from .storage_service import storage_service
from .parser_service import parser_service
from .llm_service import llm_service

logger = logging.getLogger(__name__)


class CategoryGenerationService:
    """Service for generating product categories from line sheet documents"""
    
    def __init__(self):
        """Initialize with required service dependencies"""
        self.firebase_service = firebase_service
        self.storage_service = storage_service
        self.parser_service = parser_service
        self.llm_service = llm_service
        logger.info("CategoryGenerationService initialized")
    
    async def generate_categories_for_collection(self, collection_id: str) -> Dict[str, Any]:
        """
        Main orchestrator method - generates categories for a collection.
        
        Args:
            collection_id: The collection ID
            
        Returns:
            List of generated categories
        """
        try:
            logger.info(f"Starting category generation for collection: {collection_id}")
            
            # Step 1: Fetch line sheet documents
            documents = await self.fetch_collection_line_sheets(collection_id)
            
            if not documents:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No line sheet documents found for this collection"
                )
            
            # Step 2: Download and parse documents
            parsed_text = await self.download_and_parse_documents(documents)
            
            if not parsed_text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to extract text from documents"
                )
            
            # Step 3: Normalize text
            normalized_text = self.normalize_text(parsed_text)
            logger.info(f"Normalized text length: {len(normalized_text)} characters")
            
            # Log sample of text
            logger.info(f"=== NORMALIZED TEXT (First 2000 chars) ===")
            logger.info(normalized_text[:2000])
            logger.info(f"=== END NORMALIZED TEXT SAMPLE ===")
            
            # Step 4: Generate categories using LLM with full text
            categories = await self.generate_categories_with_llm(normalized_text)
            
            logger.info(f"Successfully generated {len(categories)} categories for collection {collection_id}")
            
            # Step 5: Transform categories to match ProductCategory model
            formatted_categories = []
            for idx, category in enumerate(categories):
                formatted_subcategories = []
                for sub_idx, subcat_name in enumerate(category.get('subcategories', [])):
                    formatted_subcategories.append({
                        'name': subcat_name,
                        'product_count': 0,
                        'display_order': sub_idx
                    })
                
                formatted_categories.append({
                    'name': category.get('name'),
                    'product_count': 0,
                    'display_order': idx,
                    'subcategories': formatted_subcategories
                })
            
            # Step 6: Save categories to Firestore
            try:
                collection_ref = self.firebase_service.db.collection('collections').document(collection_id)
                collection_ref.update({
                    'categories': formatted_categories,
                    'updated_at': datetime.utcnow()
                })
                logger.info(f"Saved {len(formatted_categories)} categories to Firestore for collection {collection_id}")
            except Exception as e:
                logger.error(f"Error saving categories to Firestore: {e}")
                # Don't fail the whole operation if save fails
            
            # Return in expected format
            return {
                'success': True,
                'categories': formatted_categories,
                'product_count': 0  # Not tracking individual products anymore
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating categories for collection {collection_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate categories: {str(e)}"
            )
    
    async def fetch_collection_line_sheets(self, collection_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all line sheet documents for a collection.
        
        Args:
            collection_id: Collection ID
            
        Returns:
            List of document metadata dictionaries with document_id, storage_url, filename
        """
        try:
            logger.info(f"Fetching line sheets for collection: {collection_id}")
            
            # Query Firestore subcollection for documents in this collection
            docs_ref = self.firebase_service.db.collection('collections').document(collection_id).collection('documents')
            docs = docs_ref.stream()
            
            documents = []
            for doc in docs:
                doc_data = doc.to_dict()
                # Filter for line_sheet type
                if doc_data.get('type') == 'line_sheet':
                    documents.append({
                        'document_id': doc.id,
                        'storage_url': doc_data.get('url'),
                        'filename': doc_data.get('name'),
                        'storage_path': doc_data.get('storage_path')
                    })
            
            logger.info(f"Found {len(documents)} line sheet(s) for collection {collection_id}")
            return documents
            
        except Exception as e:
            logger.error(f"Error fetching line sheets for collection {collection_id}: {e}")
            return []
    
    async def download_and_parse_documents(self, documents: List[Dict[str, Any]]) -> str:
        """
        Download and parse documents from Firebase Storage.
        
        Args:
            documents: List of document metadata with storage URLs
            
        Returns:
            Combined parsed text from all documents
        """
        try:
            logger.info(f"Parsing {len(documents)} documents")
            combined_text = []
            
            for doc in documents:
                try:
                    storage_path = doc.get('storage_path')
                    filename = doc.get('filename', 'unknown')
                    
                    if not storage_path:
                        logger.warning(f"No storage path for document {doc.get('document_id')}")
                        continue
                    
                    # Download file from Firebase Storage
                    blob = self.storage_service._bucket.blob(storage_path)
                    file_bytes = blob.download_as_bytes()
                    
                    logger.info(f"Downloaded {filename} ({len(file_bytes)} bytes)")
                    
                    # Parse based on file type
                    file_ext = os.path.splitext(filename)[1].lower()
                    
                    if file_ext == '.pdf':
                        # Parse PDF
                        result = await self.parser_service.parse_pdf(file_bytes, filename)
                        extracted_text = result.get('extracted_text', '')
                        if extracted_text:
                            combined_text.append(extracted_text)
                            logger.info(f"Parsed PDF {filename}: {len(extracted_text)} characters")
                    
                    elif file_ext in ['.xlsx', '.xls', '.csv']:
                        # Parse spreadsheet - save to temp file for Excel parser
                        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                            tmp_file.write(file_bytes)
                            tmp_path = tmp_file.name
                        
                        try:
                            result = await self.parser_service.parse_excel(tmp_path, filename)
                            if result.get('success'):
                                # Convert spreadsheet data to text
                                sheets_text = []
                                for sheet_name, sheet_data in result.get('sheets', {}).items():
                                    # Convert rows to text
                                    for row in sheet_data:
                                        sheets_text.append(' | '.join(str(cell) for cell in row))
                                combined_text.append('\n'.join(sheets_text))
                                logger.info(f"Parsed spreadsheet {filename}")
                        finally:
                            # Clean up temp file
                            try:
                                os.unlink(tmp_path)
                            except:
                                pass  # Ignore cleanup errors
                        
                except Exception as e:
                    logger.error(f"Error parsing document {doc.get('document_id')}: {e}")
                    continue
            
            final_text = '\n\n'.join(combined_text)
            logger.info(f"Combined text length: {len(final_text)} characters")
            return final_text
            
        except Exception as e:
            logger.error(f"Error downloading and parsing documents: {e}")
            return ""
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize text by collapsing whitespace and cleaning up formatting.
        
        Args:
            text: Raw text from PDF
            
        Returns:
            Normalized text
        """
        # Collapse multiple spaces into single space
        text = re.sub(r' +', ' ', text)
        
        # Collapse multiple newlines into double newline
        text = re.sub(r'\n\n+', '\n\n', text)
        
        # Remove trailing/leading whitespace from each line
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)
        
        # Remove common footer/header patterns
        footer_patterns = [
            r'Page \d+ of \d+',
            r'\d+\s*/\s*\d+',
            r'Confidential.*',
            r'©.*\d{4}',
            r'All Rights Reserved',
            r'www\.\S+',
        ]
        
        for pattern in footer_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def detect_section_headers(self, lines: List[str]) -> Dict[int, str]:
        """
        Detect section headers using heuristics.
        
        Args:
            lines: List of text lines
            
        Returns:
            Dictionary mapping line index to detected category
        """
        headers = {}
        
        # Known header whitelist (extensible)
        known_headers = {
            'TOPS', 'BOTTOMS', 'DRESSES', 'OUTERWEAR', 'KNITWEAR',
            'SHIRTS', 'BLOUSES', 'SWEATERS', 'JACKETS', 'COATS',
            'PANTS', 'JEANS', 'SKIRTS', 'SHORTS', 'ACTIVEWEAR',
            'ACCESSORIES', 'BAGS', 'SHOES', 'JEWELRY', 'SCARVES',
            'SWIMWEAR', 'INTIMATES', 'SLEEPWEAR', 'LOUNGEWEAR'
        }
        
        for idx, line in enumerate(lines):
            line_stripped = line.strip()
            
            if not line_stripped or len(line_stripped) < 3:
                continue
            
            # Check if line is in known headers
            if line_stripped.upper() in known_headers:
                headers[idx] = line_stripped.upper()
                continue
            
            # Check ALL-CAPS heuristic (at least 3 chars, all uppercase, mostly letters)
            if (len(line_stripped) >= 3 and 
                line_stripped.isupper() and 
                sum(c.isalpha() for c in line_stripped) / len(line_stripped) > 0.5):
                headers[idx] = line_stripped
                continue
            
            # Check for spacing hints (line with lots of spaces before/after)
            if idx > 0 and idx < len(lines) - 1:
                prev_empty = not lines[idx - 1].strip()
                next_empty = not lines[idx + 1].strip()
                if prev_empty and next_empty and len(line_stripped) < 50:
                    headers[idx] = line_stripped
        
        return headers
    
    def extract_structured_products(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract structured product data with detected fields.
        
        Args:
            text: Normalized text
            
        Returns:
            List of product dictionaries with structured fields
        """
        products = []
        lines = text.split('\n')
        
        # Detect section headers
        headers = self.detect_section_headers(lines)
        
        # Track current category
        current_category = None
        
        # Common field patterns
        patterns = {
            'style_number': r'\b(?:STYLE|SKU|ITEM|#)\s*:?\s*([A-Z0-9\-]+)',
            'season': r'\b(SS|FW|SPRING|SUMMER|FALL|WINTER)\s*\d{2,4}',
            'wholesale': r'\$?\s*(\d+(?:\.\d{2})?)\s*(?:WS|WHOLESALE)',
            'msrp': r'\$?\s*(\d+(?:\.\d{2})?)\s*(?:MSRP|RETAIL)',
            'sizes': r'\b(?:SIZES?|SIZE RANGE)\s*:?\s*([XS\-XL0-9,\s/]+)',
            'color': r'\b(?:COLORS?|COLORWAYS?)\s*:?\s*([A-Za-z\s,/]+)',
        }
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Check if this is a header
            if i in headers:
                current_category = headers[i]
                i += 1
                continue
            
            # Skip empty lines
            if not line:
                i += 1
                continue
            
            # Try to extract product info
            if len(line) > 10:  # Minimum length for a product line
                product = {
                    'category_candidate': current_category,
                    'name_candidate': None,
                    'style_number': None,
                    'season': None,
                    'wholesale': None,
                    'msrp': None,
                    'sizes': None,
                    'color': None,
                    'notes': [],
                    'page': None,
                    'line_span': (i, i)
                }
                
                # Collect multi-line product info
                product_lines = [line]
                j = i + 1
                
                # Look ahead for continuation (indented lines, field patterns)
                while j < len(lines) and j not in headers:
                    next_line = lines[j].strip()
                    if not next_line:
                        break
                    
                    # Check if it's a continuation (starts with whitespace or has field pattern)
                    has_field_pattern = any(re.search(pattern, next_line, re.IGNORECASE) for pattern in patterns.values())
                    
                    if has_field_pattern or len(next_line) < 100:
                        product_lines.append(next_line)
                        j += 1
                    else:
                        break
                
                product['line_span'] = (i, j - 1)
                
                # Combine lines for analysis
                combined = ' '.join(product_lines)
                
                # Extract fields using patterns
                for field, pattern in patterns.items():
                    match = re.search(pattern, combined, re.IGNORECASE)
                    if match:
                        product[field] = match.group(1).strip()
                
                # First line is usually the product name
                product['name_candidate'] = product_lines[0][:200]
                
                # Additional lines become notes
                if len(product_lines) > 1:
                    product['notes'] = product_lines[1:]
                
                products.append(product)
                i = j
            else:
                i += 1
        
        logger.info(f"Extracted {len(products)} structured products")
        return products
    
    async def extract_products_from_text(self, parsed_text: str) -> List[Dict[str, Any]]:
        """
        Extract product information from parsed text using structured extraction.
        
        Args:
            parsed_text: Combined text from all documents
            
        Returns:
            List of product dictionaries with structured fields
        """
        try:
            logger.info("Extracting products from text")
            
            # Step 1: Normalize text
            normalized_text = self.normalize_text(parsed_text)
            logger.info(f"Normalized text length: {len(normalized_text)} characters")
            
            # Log first 2000 characters of normalized text
            logger.info(f"=== NORMALIZED TEXT (First 2000 chars) ===")
            logger.info(normalized_text[:2000])
            logger.info(f"=== END NORMALIZED TEXT SAMPLE ===")
            
            # Step 2: Extract structured products
            products = self.extract_structured_products(normalized_text)
            
            # Log structured data for debugging
            logger.info(f"=== STRUCTURED PRODUCTS (First 5) ===")
            for i, product in enumerate(products[:5]):
                logger.info(f"\nProduct {i+1}:")
                logger.info(f"  Category: {product.get('category_candidate')}")
                logger.info(f"  Name: {product.get('name_candidate')}")
                logger.info(f"  Style #: {product.get('style_number')}")
                logger.info(f"  Season: {product.get('season')}")
                logger.info(f"  Wholesale: {product.get('wholesale')}")
                logger.info(f"  MSRP: {product.get('msrp')}")
                logger.info(f"  Sizes: {product.get('sizes')}")
                logger.info(f"  Color: {product.get('color')}")
                logger.info(f"  Line span: {product.get('line_span')}")
            
            # Step 3: Convert to format expected by LLM (simplified)
            simplified_products = []
            for product in products:
                # Build a rich name that includes detected fields
                name_parts = [product['name_candidate']]
                if product.get('style_number'):
                    name_parts.append(f"[{product['style_number']}]")
                if product.get('color'):
                    name_parts.append(f"({product['color']})")
                
                simplified_products.append({
                    'name': ' '.join(name_parts),
                    'description': ' '.join(product.get('notes', []))[:200] if product.get('notes') else product['name_candidate'][:200],
                    'category_hint': product.get('category_candidate'),
                    'metadata': {
                        'style_number': product.get('style_number'),
                        'season': product.get('season'),
                        'wholesale': product.get('wholesale'),
                        'msrp': product.get('msrp'),
                        'sizes': product.get('sizes'),
                        'color': product.get('color')
                    }
                })
            
            # Limit to reasonable number for LLM processing
            simplified_products = simplified_products[:200]
            
            # Log simplified products being sent to LLM
            logger.info(f"=== SIMPLIFIED PRODUCTS FOR LLM (First 5) ===")
            for i, product in enumerate(simplified_products[:5]):
                logger.info(f"\nSimplified Product {i+1}:")
                logger.info(f"  Name: {product.get('name')}")
                logger.info(f"  Description: {product.get('description')}")
                logger.info(f"  Category Hint: {product.get('category_hint')}")
                logger.info(f"  Metadata: {product.get('metadata')}")
            
            logger.info(f"\nExtracted {len(simplified_products)} products from text")
            return simplified_products
            
        except Exception as e:
            logger.error(f"Error extracting products from text: {e}")
            return []
    
    async def generate_categories_with_llm(self, full_text: str) -> List[Dict[str, Any]]:
        """
        Generate category structure using LLM based on full document text.
        
        Args:
            full_text: Complete normalized text from line sheet documents
            
        Returns:
            List of category dictionaries with name and subcategories
        """
        try:
            logger.info(f"Generating categories from full text ({len(full_text)} characters) using LLM")
            
            # Create prompt for LLM
            system_message = """You are a fashion industry expert specializing in product categorization and line sheet analysis.
Your task is to analyze a complete fashion line sheet document and create a logical category hierarchy.
Return ONLY valid JSON with no additional text."""
            
            prompt = f"""Analyze this complete fashion line sheet document and create a category hierarchy:

DOCUMENT TEXT:
{full_text}

Your task:
1. Identify all product categories mentioned or implied in the document
2. Parse all products and their details
3. Create a logical category structure with main categories and subcategories
4. Group products appropriately

Return JSON in this exact format:
{{
  "categories": [
    {{
      "name": "Category Name",
      "subcategories": ["Subcategory 1", "Subcategory 2"]
    }}
  ]
}}

Requirements:
- Create 3-8 main categories based on what you find in the document
- Each category should have 2-6 subcategories
- Use the exact category names from the document when available
- Use standard fashion industry terminology
- Group products logically by type, style, or function
- If the document has explicit category labels, use those"""

            # Call LLM with increased token limit for larger response
            result = await self.llm_service.generate_json_completion(
                prompt=prompt,
                system_message=system_message,
                temperature=0.1,  # Deterministic for consistent categorization
                max_tokens=3000  # Increased for full document analysis
            )
            
            # Extract categories from result
            categories = result.get('categories', [])
            
            logger.info(f"Generated {len(categories)} categories from full text")
            return categories
            
        except Exception as e:
            logger.error(f"Error generating categories with LLM: {e}")
            # Return fallback categories
            return [
                {
                    "name": "Tops",
                    "subcategories": ["T-Shirts", "Blouses", "Sweaters"]
                },
                {
                    "name": "Bottoms",
                    "subcategories": ["Jeans", "Pants", "Skirts"]
                },
                {
                    "name": "Dresses",
                    "subcategories": ["Maxi", "Mini", "Midi"]
                }
            ]


# Global service instance
category_generation_service = CategoryGenerationService()
