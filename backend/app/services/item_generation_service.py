"""
Item Generation Service - Generates collection items from purchase orders and line sheets.
"""
import logging
import uuid
import hashlib
import json
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
            
            # Step 1: Fetch purchase order document
            logger.info("Step 1: Fetching purchase order")
            po_doc = await self.fetch_purchase_order(collection_id)
            if not po_doc:
                raise ValueError(f"No purchase order found for collection {collection_id}")
            
            # Step 2: Download PO file from Storage
            logger.info(f"Step 2: Downloading PO file: {po_doc['name']}")
            file_bytes = await self.storage_service.download_file(po_doc['storage_path'])
            
            # Step 3: Parse purchase order
            logger.info("Step 3: Parsing purchase order")
            parsed_data = await self.parse_purchase_order(file_bytes, po_doc['name'])
            
            # Step 4: Identify columns with LLM
            logger.info("Step 4: Identifying columns with LLM")
            column_mapping = await self.identify_columns_with_llm(
                parsed_data['headers'],
                parsed_data['rows'][:5]  # First 5 rows as sample
            )
            
            # Step 5: Extract SKU data from PO
            logger.info("Step 5: Extracting SKU data from PO")
            po_items = await self.extract_sku_data(parsed_data, column_mapping)
            
            # Step 6: Enrich from ALL line sheets
            logger.info("Step 6: Enriching from line sheets")
            enriched_items, linesheet_document_ids = await self.enrich_from_linesheet(collection_id, po_items)
            
            # Step 7: Generate item objects (skip categorization for now)
            logger.info(f"Step 7: Generating item objects (from {len(linesheet_document_ids)} line sheet(s))")
            final_items = self.generate_item_objects(
                enriched_items=enriched_items,
                collection_id=collection_id,
                po_document_id=po_doc['document_id'],
                linesheet_document_ids=linesheet_document_ids
            )
            
            # Step 8: Save to Firestore
            logger.info("Step 8: Saving items to Firestore")
            save_stats = await self.save_items_to_firestore(collection_id, final_items)
            
            logger.info(f"Item generation complete: {save_stats['items_created']} items created, {save_stats['items_skipped']} skipped")
            
            return {
                'success': True,
                'items': final_items,
                'stats': {
                    'po_items_extracted': len(po_items),
                    'line_sheets_used': len(linesheet_document_ids),
                    'items_enriched': len([i for i in enriched_items if i.get('enriched')]),
                    'items_unmatched': len([i for i in enriched_items if not i.get('enriched')]),
                    'final_items_generated': len(final_items),
                    'items_created': save_stats['items_created'],
                    'items_skipped': save_stats['items_skipped']
                }
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
    
    def generate_item_hash(self, item: Dict[str, Any]) -> str:
        """
        Generate content hash from item's core identity (SKU + color_code).
        
        Args:
            item: Item dictionary
            
        Returns:
            16-character hash string
        """
        hash_fields = {
            'sku': item.get('sku'),
            'color_code': item.get('color_code')
        }
        
        # Create deterministic JSON string
        hash_string = json.dumps(hash_fields, sort_keys=True)
        
        # Generate SHA-256 hash (first 16 chars)
        return hashlib.sha256(hash_string.encode()).hexdigest()[:16]
    
    async def fetch_linesheet(self, collection_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch line sheet document for a collection.
        
        Args:
            collection_id: Collection ID
            
        Returns:
            Line sheet document or None
        """
        try:
            logger.info(f"Fetching line sheet for collection: {collection_id}")
            
            # Query Firestore for line sheet document
            docs_ref = self.firebase_service.db.collection('collections').document(collection_id).collection('documents')
            query = docs_ref.where('type', '==', 'line_sheet').limit(1)
            docs = query.stream()
            
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['document_id'] = doc.id
                logger.info(f"Found line sheet: {doc_data.get('name')}")
                return doc_data
            
            logger.warning(f"No line sheet found for collection {collection_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching line sheet: {e}")
            return None
    
    async def fetch_all_linesheets(self, collection_id: str) -> List[Dict[str, Any]]:
        """
        Fetch ALL line sheet documents for a collection.
        
        Args:
            collection_id: Collection ID
            
        Returns:
            List of line sheet documents (empty list if none found)
        """
        try:
            logger.info(f"Fetching all line sheets for collection: {collection_id}")
            
            # Query Firestore for ALL line sheet documents (no limit)
            docs_ref = self.firebase_service.db.collection('collections').document(collection_id).collection('documents')
            query = docs_ref.where('type', '==', 'line_sheet')
            docs = query.stream()
            
            linesheets = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['document_id'] = doc.id
                linesheets.append(doc_data)
                logger.info(f"Found line sheet: {doc_data.get('name')}")
            
            logger.info(f"Found {len(linesheets)} line sheet(s) for collection {collection_id}")
            return linesheets
            
        except Exception as e:
            logger.error(f"Error fetching line sheets: {e}")
            return []
    
    def merge_structured_products(self, linesheets: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Merge structured_products from all line sheets into a unified SKU lookup.
        
        Uses "first wins" strategy for duplicate SKUs - the first line sheet's
        data takes precedence, with a warning logged for conflicts.
        
        Args:
            linesheets: List of line sheet documents with structured_products
            
        Returns:
            Dictionary mapping SKU -> product data (with source_document_id added)
        """
        merged_lookup = {}
        duplicate_skus = []
        
        for linesheet in linesheets:
            document_id = linesheet.get('document_id')
            filename = linesheet.get('name', 'unknown')
            structured_products = linesheet.get('structured_products', [])
            
            if not structured_products:
                logger.warning(f"Line sheet '{filename}' has no structured_products")
                continue
            
            logger.info(f"Processing {len(structured_products)} products from '{filename}'")
            
            for product in structured_products:
                sku = product.get('sku')
                if not sku:
                    continue
                
                if sku in merged_lookup:
                    # Duplicate SKU - log warning but keep first (first wins)
                    duplicate_skus.append(sku)
                else:
                    # Add source tracking to product
                    product_with_source = product.copy()
                    product_with_source['source_document_id'] = document_id
                    product_with_source['source_filename'] = filename
                    merged_lookup[sku] = product_with_source
        
        if duplicate_skus:
            logger.warning(f"Found {len(duplicate_skus)} duplicate SKUs across line sheets (first wins): {duplicate_skus[:10]}...")
        
        logger.info(f"Merged {len(merged_lookup)} unique SKUs from {len(linesheets)} line sheet(s)")
        return merged_lookup
    
    async def enrich_from_linesheet(
        self, 
        collection_id: str, 
        po_items: List[Dict[str, Any]]
    ) -> tuple[List[Dict[str, Any]], List[str]]:
        """
        Enrich PO items with line sheet data from ALL line sheets.
        
        Args:
            collection_id: Collection ID
            po_items: Items extracted from PO
            
        Returns:
            Tuple of (enriched items with line sheet data merged, list of line sheet document IDs)
        """
        try:
            logger.info(f"Enriching {len(po_items)} items from line sheets")
            
            # Fetch ALL line sheet documents
            linesheets = await self.fetch_all_linesheets(collection_id)
            if not linesheets:
                raise ValueError(f"No line sheets found for collection {collection_id}")
            
            # Merge structured products from all line sheets
            linesheet_lookup = self.merge_structured_products(linesheets)
            if not linesheet_lookup:
                logger.warning("No structured_products found in any line sheet")
                raise ValueError("No structured products found in line sheets")
            
            # Get list of line sheet document IDs for tracking
            linesheet_document_ids = [ls.get('document_id') for ls in linesheets if ls.get('document_id')]
            
            logger.info(f"Merged lookup has {len(linesheet_lookup)} unique SKUs from {len(linesheets)} line sheet(s)")
            
            # Enrich each PO item
            enriched_items = []
            matched_count = 0
            
            for po_item in po_items:
                po_sku = po_item.get('sku')
                po_base_sku = po_item.get('base_sku')
                
                # Try to match by full SKU first (exact match including color code)
                linesheet_data = linesheet_lookup.get(po_sku)
                
                # Fallback: try matching by base SKU if full SKU didn't match
                if not linesheet_data and po_base_sku:
                    linesheet_data = linesheet_lookup.get(po_base_sku)
                    if linesheet_data:
                        logger.debug(f"Matched by base_sku fallback: {po_base_sku} (full: {po_sku})")
                
                if linesheet_data:
                    # Get color info from line sheet (colors array with 1 item)
                    ls_colors = linesheet_data.get('colors', [])
                    ls_color = ls_colors[0] if ls_colors else {}
                    
                    enriched_item = {
                        # === FROM PO (source of truth for order) ===
                        'sku': po_sku,
                        'base_sku': po_base_sku,
                        'sizes': po_item.get('sizes', {}),
                        'quantity': po_item.get('quantity'),
                        
                        # === FROM LINE SHEET (product info) ===
                        'product_name': linesheet_data.get('product_name'),
                        'wholesale_price': linesheet_data.get('wholesale_price'),
                        'rrp': linesheet_data.get('rrp'),
                        'currency': linesheet_data.get('currency'),
                        'origin': linesheet_data.get('origin'),
                        'materials': linesheet_data.get('materials', []),
                        'images': [
                            {
                                'url': url,
                                'alt': f"{linesheet_data.get('product_name', 'Product')} - {ls_color.get('color_name', '')}"
                            }
                            for url in linesheet_data.get('images', [])
                        ],
                        
                        # === CATEGORY INFO (from line sheet) ===
                        'category': linesheet_data.get('category'),
                        'subcategory': linesheet_data.get('subcategory'),
                        
                        # === COLOR INFO (from line sheet) ===
                        'color': ls_color.get('color_name'),
                        'color_code': ls_color.get('color_code'),
                        
                        # === SOURCE TRACKING (which line sheet this came from) ===
                        'source_document_id': linesheet_data.get('source_document_id'),
                        'source_filename': linesheet_data.get('source_filename'),
                        
                        # === METADATA ===
                        'enriched': True,
                        'source': 'po_and_linesheet'
                    }
                    matched_count += 1
                else:
                    # No match found - PO only
                    enriched_item = {
                        'sku': po_sku,
                        'base_sku': po_base_sku,
                        'sizes': po_item.get('sizes', {}),
                        'quantity': po_item.get('quantity'),
                        'product_name': None,
                        'wholesale_price': None,
                        'rrp': None,
                        'currency': None,
                        'origin': None,
                        'materials': [],
                        'color': None,
                        'color_code': None,
                        'enriched': False,
                        'source': 'po_only'
                    }
                
                enriched_items.append(enriched_item)
            
            logger.info(f"Enrichment complete: {matched_count}/{len(po_items)} items matched from {len(linesheets)} line sheet(s)")
            
            if matched_count < len(po_items):
                unmatched_skus = [i['sku'] for i in enriched_items if not i['enriched']]
                logger.warning(f"Unmatched SKUs: {unmatched_skus[:10]}...")  # Log first 10
            
            return enriched_items, linesheet_document_ids
            
        except Exception as e:
            logger.error(f"Error enriching from line sheets: {e}")
            raise
    
    def generate_item_objects(
        self,
        enriched_items: List[Dict[str, Any]],
        collection_id: str,
        po_document_id: str,
        linesheet_document_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Transform enriched items into final Item model format.
        
        Args:
            enriched_items: Items from Step 5 (enrichment)
            collection_id: Collection ID
            po_document_id: Purchase order document ID
            linesheet_document_ids: List of all line sheet document IDs used
            
        Returns:
            List of final Item objects ready for Firestore
        """
        try:
            logger.info(f"Generating {len(enriched_items)} item objects")
            
            final_items = []
            now = datetime.utcnow().isoformat() + 'Z'
            
            for item in enriched_items:
                # Generate unique item ID
                item_id = f"item_{uuid.uuid4().hex[:16]}"
                
                # Generate content hash for duplicate detection
                content_hash = self.generate_item_hash(item)
                
                final_item = {
                    # === IDs ===
                    'item_id': item_id,
                    'collection_id': collection_id,
                    'content_hash': content_hash,
                    
                    # === PRODUCT INFO (from enriched item) ===
                    'product_name': item.get('product_name'),
                    'sku': item['sku'],
                    'base_sku': item.get('base_sku'),
                    'color': item.get('color'),
                    'color_code': item.get('color_code'),
                    'wholesale_price': item.get('wholesale_price'),
                    'rrp': item.get('rrp'),
                    'currency': item.get('currency', 'USD'),
                    'origin': item.get('origin'),
                    'materials': item.get('materials', []),
                    'sizes': item.get('sizes', {}),
                    
                    # === DEFAULTS (categorization skipped) ===
                    'category': item.get('category') or None,
                    'subcategory': item.get('subcategory') or None,
                    'gender': 'unisex',
                    'description': None,
                    'care_instructions': [],
                    'process': [],
                    'highlighted_item': False,
                    'images': item.get('images', []),
                    'tags': [],
                    
                    # === SOURCE TRACKING ===
                    'source_documents': {
                        'purchase_order_id': po_document_id,
                        'line_sheet_ids': linesheet_document_ids,
                        'matched_line_sheet_id': item.get('source_document_id'),
                        'matched_line_sheet_filename': item.get('source_filename')
                    },
                    
                    # === METADATA ===
                    'extraction_confidence': 1.0 if item.get('enriched') else 0.5,
                    'manual_review': not item.get('enriched'),
                    'reviewed_by': None,
                    'reviewed_at': None,
                    
                    # === TIMESTAMPS ===
                    'created_at': now,
                    'updated_at': now
                }
                
                final_items.append(final_item)
            
            logger.info(f"Generated {len(final_items)} item objects")
            return final_items
            
        except Exception as e:
            logger.error(f"Error generating item objects: {e}")
            raise
    
    async def save_items_to_firestore(
        self,
        collection_id: str,
        items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Save items to Firestore with hash-based duplicate detection.
        
        Args:
            collection_id: Collection ID
            items: Final Item objects from Step 7
            
        Returns:
            Save statistics (items_created, items_skipped)
        """
        try:
            logger.info(f"Saving {len(items)} items to Firestore")
            
            items_ref = self.firebase_service.db.collection('collections').document(collection_id).collection('items')
            
            created_count = 0
            skipped_count = 0
            
            for item in items:
                content_hash = item.get('content_hash')
                
                # Check if item with same hash already exists
                existing_query = items_ref.where('content_hash', '==', content_hash).limit(1).stream()
                existing_docs = list(existing_query)
                
                if existing_docs:
                    # Duplicate found - skip
                    logger.debug(f"Skipping duplicate item: {item['sku']} (hash: {content_hash})")
                    skipped_count += 1
                else:
                    # New item - save
                    items_ref.document(item['item_id']).set(item)
                    logger.debug(f"Created item: {item['sku']} (ID: {item['item_id']})")
                    created_count += 1
            
            # Update collection stats
            collection_ref = self.firebase_service.db.collection('collections').document(collection_id)
            now = datetime.utcnow().isoformat() + 'Z'
            
            collection_ref.update({
                'total_items': created_count,
                'items_generated_at': now,
                'updated_at': now
            })
            
            logger.info(f"Save complete: {created_count} created, {skipped_count} skipped")
            
            return {
                'items_created': created_count,
                'items_skipped': skipped_count,
                'total_items': created_count
            }
            
        except Exception as e:
            logger.error(f"Error saving items to Firestore: {e}")
            raise


# Global service instance
item_generation_service = ItemGenerationService()
