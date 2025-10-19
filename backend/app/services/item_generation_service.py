"""
Item Generation Service - Generates collection items from purchase orders and line sheets.
"""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from .firebase_service import firebase_service
from .storage_service import storage_service
from .parser_service import parser_service
from .llm_service import llm_service

logger = logging.getLogger(__name__)


class ItemGenerationService:
    """Service for generating collection items from purchase orders"""
    
    def __init__(self):
        self.firebase_service = firebase_service
        self.storage_service = storage_service
        self.parser_service = parser_service
        self.llm_service = llm_service
        logger.info("ItemGenerationService initialized")
    
    async def generate_items_for_collection(self, collection_id: str) -> Dict[str, Any]:
        """
        Main orchestrator method - generates items for a collection.
        
        Args:
            collection_id: The collection ID
            
        Returns:
            Dictionary with success status and generated items
        """
        try:
            logger.info(f"Starting item generation for collection: {collection_id}")
            
            # TODO: Implement item generation flow
            # Step 1: Fetch purchase order
            # Step 2: Parse purchase order
            # Step 3: Identify columns with LLM
            # Step 4: Extract SKU data
            # Step 5: Enrich from line sheet
            # Step 6: Categorize items
            # Step 7: Generate item objects
            # Step 8: Save to Firestore
            
            return {
                'success': True,
                'items': [],
                'message': 'Item generation not yet implemented'
            }
            
        except Exception as e:
            logger.error(f"Error generating items for collection {collection_id}: {e}")
            return {
                'success': False,
                'items': [],
                'error': str(e)
            }
    
    async def fetch_purchase_order(self, collection_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch purchase order document for a collection.
        
        Args:
            collection_id: Collection ID
            
        Returns:
            Purchase order document metadata or None
        """
        try:
            logger.info(f"Fetching purchase order for collection: {collection_id}")
            
            # Query Firestore for purchase order document
            docs_ref = self.firebase_service.db.collection('collections').document(collection_id).collection('documents')
            query = docs_ref.where('type', '==', 'purchase_order').limit(1)
            docs = query.stream()
            
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['document_id'] = doc.id
                logger.info(f"Found purchase order: {doc_data.get('name')}")
                return doc_data
            
            logger.warning(f"No purchase order found for collection {collection_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching purchase order: {e}")
            return None
    
    async def parse_purchase_order(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Parse purchase order spreadsheet.
        
        Args:
            file_bytes: File content as bytes
            filename: Original filename
            
        Returns:
            Parsed spreadsheet data with headers and rows
        """
        try:
            logger.info(f"Parsing purchase order: {filename}")
            
            # Parse Excel file with raw data
            parsed = await self.parser_service.parse_excel(file_bytes, filename, include_raw_data=True)
            
            # Get first sheet (POs are typically single sheet)
            if not parsed.get('sheets') or len(parsed['sheets']) == 0:
                raise ValueError("No sheets found in purchase order")
            
            sheet = parsed['sheets'][0]
            
            # Extract raw headers and rows
            headers = sheet.get('raw_headers', [])
            rows = sheet.get('raw_rows', [])
            
            logger.info(f"Parsed PO: {len(headers)} columns, {len(rows)} rows")
            
            return {
                'headers': headers,
                'rows': rows,
                'filename': filename,
                'sheet_name': sheet.get('sheet_name', 'Sheet1')
            }
            
        except Exception as e:
            logger.error(f"Error parsing purchase order: {e}")
            raise
    
    async def identify_columns_with_llm(self, headers: List[str], sample_rows: List[List[Any]]) -> Dict[str, Any]:
        """
        Use LLM to identify which columns contain SKU, color, size, quantity.
        
        Args:
            headers: List of column headers
            sample_rows: First 5 rows of data
            
        Returns:
            Column mapping dictionary with column indices
        """
        try:
            logger.info("Identifying columns using LLM")
            
            # Prepare data for LLM
            # Format: Show headers with indices and sample data
            data_preview = f"Column Headers (with index):\n"
            for idx, header in enumerate(headers):
                data_preview += f"  [{idx}] {header}\n"
            
            data_preview += f"\nSample Data (first 5 rows):\n"
            for row_idx, row in enumerate(sample_rows[:5]):
                data_preview += f"Row {row_idx + 1}: {row}\n"
            
            # Create prompt for LLM
            system_message = """You are a data analysis expert specializing in purchase order documents.
Your task is to identify which columns contain specific data types.
Return ONLY valid JSON with no additional text."""
            
            prompt = f"""Analyze this purchase order spreadsheet and identify which columns contain the following data:

{data_preview}

Identify the column INDEX (0-based) for each of the following:
1. SKU/Style Number/Product Code (REQUIRED - the unique product identifier)
2. Color/Colorway (OPTIONAL - color variants)
3. Size/Size Range (OPTIONAL - size information)
4. Quantity/Units (OPTIONAL - order quantity)

Return JSON in this exact format:
{{
  "sku_column": <index or null>,
  "color_column": <index or null>,
  "size_column": <index or null>,
  "quantity_column": <index or null>
}}

Rules:
- Return the column INDEX (number), not the column name
- If a column is not found, return null
- SKU column is REQUIRED - if you cannot identify it with confidence, return null
- Look at both the header name AND the sample data to make your decision
- Column names may be in any language (English, Chinese, etc.)"""

            # Call LLM
            result = await self.llm_service.generate_json_completion(
                prompt=prompt,
                system_message=system_message,
                temperature=0.0,  # Deterministic
                max_tokens=500
            )
            
            # Validate SKU column was found
            if result.get('sku_column') is None:
                raise ValueError("LLM could not identify SKU column in purchase order")
            
            logger.info(f"Column mapping: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error identifying columns: {e}")
            raise
    
    async def extract_sku_data(self, parsed_data: Dict[str, Any], column_mapping: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract SKU data from parsed spreadsheet using column mapping.
        
        Args:
            parsed_data: Parsed spreadsheet data (headers + rows)
            column_mapping: Column mapping from LLM (column indices)
            
        Returns:
            List of item dictionaries with SKU, color, sizes, etc.
        """
        try:
            logger.info("Extracting SKU data from purchase order")
            
            headers = parsed_data['headers']
            rows = parsed_data['rows']
            
            # Get column indices
            sku_col = column_mapping.get('sku_column')
            color_col = column_mapping.get('color_column')
            size_col = column_mapping.get('size_column')
            quantity_col = column_mapping.get('quantity_column')
            
            items = []
            
            for row_idx, row in enumerate(rows):
                try:
                    # Skip empty rows
                    if not row or all(cell == '' or cell is None for cell in row):
                        continue
                    
                    # Extract SKU (required)
                    if sku_col is None or sku_col >= len(row):
                        logger.warning(f"Skipping row {row_idx + 1}: No SKU column or row too short")
                        continue
                    
                    sku = str(row[sku_col]).strip()
                    if not sku or sku == '':
                        logger.warning(f"Skipping row {row_idx + 1}: Empty SKU")
                        continue
                    
                    # Extract base_sku and color_code from SKU
                    if '-' in sku:
                        base_sku, color_code = sku.rsplit('-', 1)
                    else:
                        base_sku = sku
                        color_code = None
                    
                    # Extract color (optional)
                    color = None
                    if color_col is not None and color_col < len(row):
                        color = str(row[color_col]).strip() if row[color_col] else None
                    
                    # Extract size (optional)
                    size_raw = None
                    if size_col is not None and size_col < len(row):
                        size_raw = str(row[size_col]).strip() if row[size_col] else None
                    
                    # Extract quantity (optional)
                    quantity = None
                    if quantity_col is not None and quantity_col < len(row):
                        try:
                            quantity = int(float(row[quantity_col])) if row[quantity_col] else None
                        except (ValueError, TypeError):
                            logger.warning(f"Row {row_idx + 1}: Could not parse quantity: {row[quantity_col]}")
                    
                    # Parse sizes into dict
                    sizes = self._parse_sizes(size_raw, quantity)
                    
                    # Create item record
                    item = {
                        'sku': sku,
                        'base_sku': base_sku,
                        'color': color,
                        'color_code': color_code,
                        'sizes': sizes,
                        'quantity': quantity
                    }
                    
                    items.append(item)
                    
                except Exception as row_error:
                    logger.error(f"Error processing row {row_idx + 1}: {row_error}")
                    continue
            
            logger.info(f"Extracted {len(items)} items from purchase order")
            return items
            
        except Exception as e:
            logger.error(f"Error extracting SKU data: {e}")
            raise
    
    def _parse_sizes(self, size_raw: Optional[str], quantity: Optional[int]) -> Dict[str, int]:
        """
        Parse size string into sizes dict.
        
        Args:
            size_raw: Raw size string from PO (e.g., "S-XL", "S, M, L", "One Size")
            quantity: Total quantity for this item
            
        Returns:
            Dict mapping size to quantity (e.g., {"S": 50, "M": 50, "L": 50})
        """
        if not size_raw:
            return {}
        
        size_raw = size_raw.strip().upper()
        quantity = quantity or 0
        
        # Handle size ranges (e.g., "S-XL", "XS-L")
        if '-' in size_raw and len(size_raw) <= 10:  # Likely a range, not a product code
            parts = size_raw.split('-')
            if len(parts) == 2:
                start_size = parts[0].strip()
                end_size = parts[1].strip()
                
                # Standard size order
                size_order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
                
                try:
                    start_idx = size_order.index(start_size)
                    end_idx = size_order.index(end_size)
                    
                    # Extract sizes in range
                    sizes_in_range = size_order[start_idx:end_idx + 1]
                    return {size: quantity for size in sizes_in_range}
                except ValueError:
                    # If sizes not in standard order, just use both
                    return {start_size: quantity, end_size: quantity}
        
        # Handle comma or slash separated (e.g., "S, M, L" or "S/M/L")
        if ',' in size_raw or '/' in size_raw:
            separator = ',' if ',' in size_raw else '/'
            sizes = [s.strip() for s in size_raw.split(separator) if s.strip()]
            return {size: quantity for size in sizes}
        
        # Single size or "One Size"
        return {size_raw: quantity}


# Global service instance
item_generation_service = ItemGenerationService()
