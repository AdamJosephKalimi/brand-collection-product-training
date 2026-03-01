"""
Collection Document Service for managing collection document CRUD operations with Firebase.
"""
from typing import List, Dict, Any
from datetime import datetime
import uuid
import os
from pathlib import Path
from fastapi import HTTPException, status, UploadFile
from ..models.collection_document import CollectionDocument, CollectionDocumentCreate, CollectionDocumentUpdate, CollectionDocumentResponse
from .firebase_service import firebase_service
from .storage_service import storage_service
from .collection_service import collection_service
from .parser_service import parser_service
from .category_generation_service import category_generation_service
from .llm_service import llm_service
import logging
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class CollectionDocumentService:
    """Service for managing collection document operations"""
    
    def __init__(self):
        self.db = firebase_service.db
        self.collections_collection = "collections"
        self.parser_service = parser_service
        self.storage_service = storage_service
    
    async def validate_collection_ownership(self, collection_id: str, user_id: str) -> Dict[str, Any]:
        """
        Validate that a user owns a collection through brand ownership.
        
        Args:
            collection_id: The collection ID to check
            user_id: The user ID to validate
            
        Returns:
            Collection data if user owns it
            
        Raises:
            HTTPException: If collection not found or user doesn't have access
        """
        try:
            # Get collection
            collection_ref = self.db.collection(self.collections_collection).document(collection_id)
            collection_doc = collection_ref.get()
            
            if not collection_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Collection with ID {collection_id} not found"
                )
            
            collection_data = collection_doc.to_dict()
            brand_id = collection_data.get('brand_id')
            
            # Get brand and check ownership
            brand_ref = self.db.collection("brands").document(brand_id)
            brand_doc = brand_ref.get()
            
            if not brand_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Brand with ID {brand_id} not found"
                )
            
            brand_data = brand_doc.to_dict()
            if brand_data.get('owner_id') != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this collection"
                )
            
            return collection_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating collection ownership: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to validate collection ownership: {str(e)}"
            )
    
    async def upload_document(
        self, 
        collection_id: str, 
        user_id: str, 
        file: UploadFile,
        document_data: CollectionDocumentCreate,
        process: bool = True
    ) -> CollectionDocumentResponse:
        """
        Upload a document to Firebase Storage and create Firestore record.
        
        Args:
            collection_id: The parent collection ID
            user_id: The authenticated user's ID
            file: The uploaded file
            document_data: Document metadata
            process: Whether to process document immediately (default: True for backward compatibility)
            
        Returns:
            Created document response
            
        Raises:
            HTTPException: If collection not found or upload fails
        """
        try:
            # Validate collection ownership and get collection data
            collection_data = await self.validate_collection_ownership(collection_id, user_id)
            brand_id = collection_data.get('brand_id')
            
            # Generate document ID
            document_id = str(uuid.uuid4())
            
            # Get file extension
            file_extension = Path(file.filename).suffix.lower()
            
            # Upload to Firebase Storage
            storage_path = f"brands/{brand_id}/collections/{collection_id}/documents/{document_id}{file_extension}"
            file_url = await storage_service.upload_file(file, storage_path)
            
            # Get file size
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning

            # For Excel files, extract row count at upload time for ETA estimation
            row_count = None
            if file_extension in ['.xlsx', '.xls']:
                try:
                    file.file.seek(0)
                    file_bytes_temp = await file.read()
                    file.file.seek(0)
                    result = await self.parser_service.parse_excel(file_bytes_temp, file.filename)
                    row_count = result.get('metadata', {}).get('total_rows', 0) or None
                    logger.info(f"[ETA] Extracted row_count={row_count} at upload time")
                except Exception as e:
                    logger.warning(f"[ETA] Could not extract row count at upload: {e}")

            # Prepare document record
            document_doc = {
                "document_id": document_id,
                "collection_id": collection_id,
                "brand_id": brand_id,
                "name": document_data.name,
                "type": document_data.type.value,
                "file_type": file_extension.lstrip('.'),
                "storage_path": storage_path,
                "url": file_url,
                "file_size_bytes": file_size,
                "parsed_text": None,
                "normalized_text": None,
                "parsed_at": None,
                "structured_products": None,
                "extraction_progress": None,
                "row_count": row_count,
                "uploaded_by": user_id,
                "uploaded_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Save to Firestore subcollection
            docs_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents')
            doc_ref = docs_ref.document(document_id)
            doc_ref.set(document_doc)
            
            # Parse and store text only if process=True (synchronous - wait for completion)
            if process:
                try:
                    file.file.seek(0)  # Reset file pointer
                    file_bytes = await file.read()
                    await self._parse_and_store_text(
                        collection_id, 
                        document_id, 
                        file_bytes, 
                        file.filename,
                        document_data.type.value  # Pass document type for structured extraction
                    )
                except Exception as parse_error:
                    logger.error(f"Error parsing document text: {parse_error}")
                    # Don't fail the upload if parsing fails
            
            # Update collection stats
            collection_ref = self.db.collection(self.collections_collection).document(collection_id)
            collection_doc = collection_ref.get()
            if collection_doc.exists:
                collection_data = collection_doc.to_dict()
                stats = collection_data.get('stats', {})
                stats['total_collection_documents'] = stats.get('total_collection_documents', 0) + 1
                collection_ref.update({
                    'stats': stats,
                    'updated_at': datetime.utcnow()
                })
            
            # Fetch the updated document with parsed text
            updated_doc = doc_ref.get()
            if updated_doc.exists:
                updated_doc_data = updated_doc.to_dict()
                return CollectionDocumentResponse(**updated_doc_data)
            else:
                # Fallback to original doc if fetch fails
                return CollectionDocumentResponse(**document_doc)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading collection document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload document: {str(e)}"
            )
    
    async def get_collection_documents(
        self, 
        collection_id: str, 
        user_id: str
    ) -> List[CollectionDocumentResponse]:
        """
        Get all documents for a collection.
        
        Args:
            collection_id: The collection ID
            user_id: The authenticated user's ID
            
        Returns:
            List of document responses
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Query documents subcollection
            docs_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents')
            docs = docs_ref.stream()
            
            documents = []
            for doc in docs:
                doc_data = doc.to_dict()
                # Ensure all required fields exist (for backward compatibility)
                if 'parsed_text' not in doc_data:
                    doc_data['parsed_text'] = None
                if 'normalized_text' not in doc_data:
                    doc_data['normalized_text'] = None
                if 'parsed_at' not in doc_data:
                    doc_data['parsed_at'] = None
                if 'structured_products' not in doc_data:
                    doc_data['structured_products'] = None
                if 'extraction_progress' not in doc_data:
                    doc_data['extraction_progress'] = None
                if 'status' not in doc_data:
                    doc_data['status'] = None
                documents.append(CollectionDocumentResponse(**doc_data))
            
            return documents
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting collection documents: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve documents: {str(e)}"
            )
    
    async def get_document(
        self, 
        collection_id: str, 
        document_id: str, 
        user_id: str
    ) -> CollectionDocumentResponse:
        """
        Get a specific document by ID.
        
        Args:
            collection_id: The collection ID
            document_id: The document ID to retrieve
            user_id: The authenticated user's ID
            
        Returns:
            Document response
            
        Raises:
            HTTPException: If document not found or user doesn't have access
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Get document
            doc_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents').document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with ID {document_id} not found"
                )
            
            doc_data = doc.to_dict()
            # Ensure all required fields exist (for backward compatibility)
            if 'parsed_text' not in doc_data:
                doc_data['parsed_text'] = None
            if 'normalized_text' not in doc_data:
                doc_data['normalized_text'] = None
            if 'parsed_at' not in doc_data:
                doc_data['parsed_at'] = None
            if 'structured_products' not in doc_data:
                doc_data['structured_products'] = None
            if 'extraction_progress' not in doc_data:
                doc_data['extraction_progress'] = None
            if 'status' not in doc_data:
                doc_data['status'] = None
            return CollectionDocumentResponse(**doc_data)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting collection document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve document: {str(e)}"
            )
    
    async def update_document(
        self, 
        collection_id: str, 
        document_id: str, 
        user_id: str, 
        update_data: CollectionDocumentUpdate
    ) -> CollectionDocumentResponse:
        """
        Update document metadata.
        
        Args:
            collection_id: The collection ID
            document_id: The document ID to update
            user_id: The authenticated user's ID
            update_data: Document update data
            
        Returns:
            Updated document response
            
        Raises:
            HTTPException: If document not found or user doesn't have access
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Get document reference
            doc_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents').document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with ID {document_id} not found"
                )
            
            # Prepare update
            update_doc = {}
            update_fields = update_data.model_dump(exclude_unset=True, exclude_none=True)
            
            for field, value in update_fields.items():
                if field == "type" and value:
                    update_doc["type"] = value.value
                else:
                    update_doc[field] = value
            
            # Always update timestamp
            update_doc["updated_at"] = datetime.utcnow()
            
            # Update in Firestore
            doc_ref.update(update_doc)
            
            # Return updated document
            return await self.get_document(collection_id, document_id, user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating collection document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update document: {str(e)}"
            )
    
    async def delete_document(
        self, 
        collection_id: str, 
        document_id: str, 
        user_id: str
    ) -> Dict[str, str]:
        """
        Delete a document from Firebase Storage and Firestore.
        
        Args:
            collection_id: The collection ID
            document_id: The document ID to delete
            user_id: The authenticated user's ID
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If document not found or user doesn't have access
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Get document data before deletion
            doc_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents').document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with ID {document_id} not found"
                )
            
            doc_data = doc.to_dict()
            storage_path = doc_data.get('storage_path')
            file_size = doc_data.get('file_size_bytes', 0)
            document_type = doc_data.get('type')

            # Delete from Firebase Storage
            if storage_path:
                await storage_service.delete_file(storage_path)

            # Clean up Pinecone vectors for collection context documents
            if document_type == 'collection_context' and doc_data.get('status') == 'processed':
                try:
                    from .pinecone_service import pinecone_service
                    await pinecone_service.delete_by_metadata({"document_id": document_id})
                    logger.info(f"Cleaned up Pinecone vectors for collection context document {document_id}")
                except Exception as e:
                    logger.error(f"Failed to clean up Pinecone vectors for {document_id}: {e}")

            # Delete from Firestore
            doc_ref.delete()
            
            # Update collection stats
            collection_ref = self.db.collection(self.collections_collection).document(collection_id)
            collection_doc = collection_ref.get()
            if collection_doc.exists:
                collection_data = collection_doc.to_dict()
                stats = collection_data.get('stats', {})
                stats['total_collection_documents'] = max(0, stats.get('total_collection_documents', 0) - 1)
                collection_ref.update({
                    'stats': stats,
                    'updated_at': datetime.utcnow()
                })
            
            return {"message": f"Document {document_id} successfully deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting collection document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete document: {str(e)}"
            )
    
    async def _parse_and_store_text(
        self, 
        collection_id: str, 
        document_id: str, 
        file_bytes: bytes, 
        filename: str,
        document_type: str,
        progress_callback=None
    ):
        """
        Parse document and store extracted/normalized text in Firestore.
        For line sheets, also extract structured product data.
        
        Args:
            collection_id: Collection ID
            document_id: Document ID
            file_bytes: File content as bytes
            filename: Original filename
            document_type: Document type (line_sheet, purchase_order, etc.)
            progress_callback: Optional async callback function(phase, message) for progress updates
        """
        try:
            logger.info(f"Parsing document: {filename}")
            
            # Extract text based on file type
            file_ext = os.path.splitext(filename)[1].lower()
            parsed_text = ""
            
            if file_ext == '.pdf':
                # Open PDF with PyMuPDF
                pdf = fitz.open(stream=file_bytes, filetype="pdf")
                
                # PHASE 1: Extract images from PDF
                if progress_callback:
                    await progress_callback(phase=1, message="Extracting images")
                
                logger.info("=" * 50)
                logger.info("PHASE 1: Extracting images from PDF")
                logger.info("=" * 50)
                all_images = await self._extract_images_from_pdf(file_bytes, collection_id, document_id)
                logger.info(f"✅ PHASE 1: Extracted {len(all_images)} images")
                for i, img in enumerate(all_images[:5]):  # Log first 5 images
                    logger.info(f"  Image {i+1}: Page {img['page_number']}, Size {img['bbox']['width']}x{img['bbox']['height']}")
                    logger.info(f"    Full URL: {img['url']}")
                logger.info("=" * 50)
                
                # PHASE 3: Filter product images (remove small images like swatches/logos)
                if progress_callback:
                    await progress_callback(phase=3, message="Filtering product images")
                
                logger.info("=" * 50)
                logger.info("PHASE 3: Filtering product images")
                logger.info("=" * 50)
                product_images = self._filter_product_images(all_images, min_width=50, min_height=50)
                logger.info(f"✅ PHASE 3: Kept {len(product_images)} product images")
                for i, img in enumerate(product_images[:5]):  # Log first 5 filtered images
                    logger.info(f"  Product Image {i+1}: Page {img['page_number']}, Size {img['bbox']['width']}x{img['bbox']['height']}")
                logger.info("=" * 50)
                
                # Store filtered image metadata for Phase 4 matching
                image_metadata = product_images
                
                # PHASE 2: Extract text blocks with positions (for image matching)
                if progress_callback:
                    await progress_callback(phase=2, message="Extracting text")
                
                # Extract text using parser_service (for LLM processing)
                result = await self.parser_service.parse_pdf(file_bytes, filename)
                parsed_text = result.get('extracted_text', '')
                logger.info(f"Parsed PDF {filename}: {len(parsed_text)} characters")
                
                logger.info("=" * 50)
                logger.info("PHASE 2: Extracting text blocks with positions")
                logger.info("=" * 50)
                _, text_blocks = self._extract_text_with_positions(pdf)
                logger.info(f"✅ PHASE 2: Extracted {len(text_blocks)} text blocks for image matching")
                for i, block in enumerate(text_blocks[:5]):  # Log first 5 blocks
                    logger.info(f"  Block {i+1}: Page {block['page_number']}, Text: {block['text'][:50]}...")
                    logger.info(f"    Position: ({block['center']['x']:.1f}, {block['center']['y']:.1f})")
                logger.info("=" * 50)
                
                # Close PDF
                pdf.close()
            
            elif file_ext in ['.xlsx', '.xls']:
                # Parse Excel
                result = await self.parser_service.parse_excel(file_bytes, filename)
                if result.get('sheets'):
                    # Convert sheets to text
                    sheets_text = []
                    for sheet in result['sheets']:
                        sheet_text = sheet.get('text', '')
                        if sheet_text:
                            sheets_text.append(sheet_text)
                    parsed_text = '\n\n'.join(sheets_text)
                    logger.info(f"Parsed Excel {filename}: {len(parsed_text)} characters")

                # Store row count on document record for ETA estimation
                row_count = result.get('metadata', {}).get('total_rows', 0)
                if row_count > 0:
                    eta_doc_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents').document(document_id)
                    eta_doc_ref.update({'row_count': row_count})
                    logger.info(f"[ETA] Stored row_count={row_count} on document {document_id}")

            else:
                logger.warning(f"Unsupported file type for parsing: {file_ext}")
                return
            
            # Normalize text using category generation service
            normalized_text = category_generation_service.normalize_text(parsed_text)
            logger.info(f"Normalized text: {len(normalized_text)} characters")
            
            # Extract structured products for line sheets
            structured_products = None
            if document_type == 'line_sheet' and normalized_text:
                # PHASE 4: Generate and save categories first
                if progress_callback:
                    await progress_callback(phase=4, message="Generating categories")
                
                logger.info("Document is a line sheet, generating categories first...")
                categories = await self._generate_and_save_categories(
                    normalized_text,
                    collection_id
                )
                
                # PHASE 5: Extract structured products with category assignment
                # progress_callback passed through for per-chunk ETA recalibration
                logger.info("Extracting structured products with category assignment...")
                structured_products = await self._extract_structured_products(
                    normalized_text,
                    collection_id,
                    document_id,
                    categories,
                    progress_callback=progress_callback
                )
                
                # PHASE 6: Match images to products
                if structured_products and 'text_blocks' in locals() and 'image_metadata' in locals():
                    if progress_callback:
                        await progress_callback(phase=6, message="Matching images to products")
                    
                    logger.info("=" * 50)
                    logger.info("PHASE 6: Matching images to products")
                    logger.info("=" * 50)
                    structured_products = self._match_images_to_products(
                        structured_products,
                        text_blocks,
                        image_metadata
                    )
                    logger.info("=" * 50)
            
            # Update document in Firestore
            # Split into two writes to avoid 1MB document size limit:
            # 1. Critical write: structured_products (with matched images) — used by item generation
            # 2. Cache write: parsed/normalized text — used by category regen (can re-parse if missing)
            # text_blocks and image_metadata are NOT persisted — only needed in-memory for Phase 6 matching
            doc_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents').document(document_id)

            # Write 1: structured products with images (critical — must succeed)
            critical_data = {
                'parsed_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            if structured_products is not None:
                critical_data['structured_products'] = structured_products

            doc_ref.update(critical_data)
            logger.info(f"Successfully stored structured products for document {document_id}")

            # Write 2: parsed/normalized text cache (non-critical — category regen can re-parse PDF)
            try:
                doc_ref.update({
                    'parsed_text': parsed_text,
                    'normalized_text': normalized_text,
                    'updated_at': datetime.utcnow()
                })
                logger.info(f"Successfully cached parsed text for document {document_id}")
            except Exception as text_err:
                logger.warning(f"Could not cache parsed text (document may be near 1MB limit): {text_err}")
                logger.warning("Category regeneration will re-parse the PDF instead of using cached text")
            
        except Exception as e:
            logger.error(f"Error parsing and storing text for document {document_id}: {e}")
            # Don't raise - parsing failure shouldn't block document upload
    
    async def _generate_and_save_categories(
        self,
        normalized_text: str,
        collection_id: str
    ) -> List[Dict[str, Any]]:
        """
        Generate categories from normalized text and save to collection.
        Uses category_generation_service for LLM call and formatting.
        
        Args:
            normalized_text: Normalized text from line sheet
            collection_id: Collection ID
            
        Returns:
            List of formatted category objects with name and subcategories
        """
        try:
            logger.info("Generating categories from line sheet text...")
            
            # Step 1: Generate categories using existing service
            categories = await category_generation_service.generate_categories_with_llm(
                normalized_text
            )
            
            logger.info(f"LLM returned {len(categories)} categories")
            
            # Step 2: Format categories (same logic as category_generation_service)
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
            
            # Step 3: Save to Firestore
            collection_ref = self.db.collection(self.collections_collection).document(collection_id)
            collection_ref.update({
                'categories': formatted_categories,
                'updated_at': datetime.utcnow()
            })
            
            logger.info(f"Generated and saved {len(formatted_categories)} categories")
            return formatted_categories
            
        except Exception as e:
            logger.error(f"Error generating categories: {e}")
            # Return empty list if generation fails (graceful degradation)
            return []
    
    def _create_large_chunks(self, text: str, chunk_size: int = 30000, overlap: int = 3000) -> List[str]:
        """
        Create large overlapping chunks for LLM processing.
        
        Args:
            text: Text to chunk
            chunk_size: Target size per chunk in characters (default 30000)
            overlap: Overlap between chunks in characters (default 3000)
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        text_length = len(text)
        last_end = 0
        
        while start < text_length:
            # Calculate end position
            end = start + chunk_size
            
            # If not at the end, find a natural break point
            if end < text_length:
                # Search for break point in overlap zone
                search_start = max(start, end - overlap)
                search_end = min(text_length, end + overlap)
                
                # Prefer double newline (paragraph break)
                break_point = text.rfind('\n\n', search_start, search_end)
                
                # Fall back to single newline
                if break_point == -1 or break_point <= start:
                    break_point = text.rfind('\n', search_start, search_end)
                
                # Fall back to space
                if break_point == -1 or break_point <= start:
                    break_point = text.rfind(' ', search_start, search_end)
                
                # Use break point if found
                if break_point > start:
                    end = break_point
            else:
                # Last chunk, take everything
                end = text_length
            
            # Extract chunk
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move to next position with overlap
            if end >= text_length:
                break
            else:
                start = end - overlap
                # Ensure we're making progress
                if start <= last_end:
                    start = end
                last_end = end
        
        logger.info(f"Created {len(chunks)} chunks (avg {len(text)//len(chunks) if chunks else 0} chars each)")
        return chunks
    
    def _match_images_to_products(
        self,
        structured_products: List[Dict[str, Any]],
        text_blocks: List[Dict[str, Any]],
        image_metadata: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Match images to products based on proximity to SKU text blocks.
        
        Args:
            structured_products: List of products with SKUs
            text_blocks: List of text blocks with positions
            image_metadata: List of images with positions
            
        Returns:
            Updated structured_products with 'images' field
        """
        import math
        
        # Index images by page for faster lookup
        images_by_page = {}
        for img in image_metadata:
            page = img.get('page_number')
            if page not in images_by_page:
                images_by_page[page] = []
            images_by_page[page].append(img)
        
        matched_count = 0
        
        for product in structured_products:
            sku = product.get('sku')
            if not sku:
                product['images'] = []
                continue
            
            # Find text block containing this SKU
            text_block = None
            for block in text_blocks:
                if sku in block.get('text', ''):
                    text_block = block
                    break
            
            if not text_block:
                logger.warning(f"No text block found for SKU: {sku}")
                product['images'] = []
                continue
            
            # Get images on the same page
            page = text_block.get('page_number')
            page_images = images_by_page.get(page, [])
            
            if not page_images:
                logger.warning(f"No images found on page {page} for SKU: {sku}")
                product['images'] = []
                continue
            
            # Calculate distance from text block to each image
            text_center = text_block.get('center', {})
            text_x = text_center.get('x', 0)
            text_y = text_center.get('y', 0)
            
            closest_image = None
            min_distance = float('inf')
            
            for img in page_images:
                img_center = img.get('center', {})
                img_x = img_center.get('x', 0)
                img_y = img_center.get('y', 0)
                
                # Calculate Euclidean distance
                distance = math.sqrt((img_x - text_x)**2 + (img_y - text_y)**2)
                
                if distance < min_distance:
                    min_distance = distance
                    closest_image = img
            
            # Assign closest image to product
            if closest_image:
                product['images'] = [closest_image.get('url')]
                matched_count += 1
                logger.debug(f"Matched SKU {sku} to image at distance {min_distance:.1f}px")
            else:
                product['images'] = []
        
        logger.info(f"✅ Matched images to {matched_count}/{len(structured_products)} products")
        return structured_products
    
    def _filter_product_images(
        self,
        images: List[Dict[str, Any]],
        min_width: int = 150,
        min_height: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Filter out small images (color swatches, logos, decorative elements).
        Keep only product-sized images for matching.
        
        Args:
            images: List of all extracted images with bbox metadata
            min_width: Minimum width in pixels (default 150)
            min_height: Minimum height in pixels (default 150)
            
        Returns:
            Filtered list of product images only
        """
        product_images = [
            img for img in images
            if img['bbox']['width'] >= min_width 
            and img['bbox']['height'] >= min_height
        ]
        
        logger.info(f"Filtered {len(images)} images → {len(product_images)} product images (removed {len(images) - len(product_images)} small images)")
        return product_images
    
    def _extract_text_with_positions(
        self,
        pdf: Any  # fitz.Document
    ) -> tuple[str, List[Dict[str, Any]]]:
        """
        Extract text AND text block positions from PDF.
        
        Args:
            pdf: PyMuPDF (fitz) Document object
            
        Returns:
            Tuple of (full_text, text_blocks)
            - full_text: Concatenated text for normalization/categories (same as before)
            - text_blocks: List of text chunks with position metadata for image matching
        """
        full_text = ""
        text_blocks = []
        
        try:
            for page_num, page in enumerate(pdf):
                # Get text blocks with positions
                blocks = page.get_text("blocks")
                
                for block in blocks:
                    # Unpack block tuple: (x0, y0, x1, y1, text, block_no, block_type)
                    x0, y0, x1, y1, text, block_no, block_type = block
                    
                    # Skip empty blocks
                    if not text or not text.strip():
                        continue
                    
                    # Add to full text (for existing pipeline)
                    full_text += text
                    
                    # Calculate dimensions and center
                    width = x1 - x0
                    height = y1 - y0
                    center_x = (x0 + x1) / 2
                    center_y = (y0 + y1) / 2
                    
                    # Store block with position metadata (for image matching)
                    text_blocks.append({
                        'page_number': page_num + 1,  # 1-indexed
                        'block_number': block_no,
                        'text': text.strip(),
                        'bbox': {
                            'x0': x0,
                            'y0': y0,
                            'x1': x1,
                            'y1': y1,
                            'width': width,
                            'height': height
                        },
                        'center': {
                            'x': center_x,
                            'y': center_y
                        }
                    })
            
            logger.info(f"Extracted {len(text_blocks)} text blocks with positions")
            return full_text, text_blocks
            
        except Exception as e:
            logger.error(f"Error extracting text with positions: {e}")
            # Return empty results on error
            return "", []
    
    async def _extract_images_from_pdf(
        self,
        file_bytes: bytes,
        collection_id: str,
        document_id: str
    ) -> List[Dict[str, Any]]:
        """
        Extract images from PDF and upload to Firebase Storage.
        
        Args:
            file_bytes: PDF file content as bytes
            collection_id: Collection ID
            document_id: Document ID
            
        Returns:
            List of image metadata with URLs, positions, and bounding boxes
        """
        try:
            # Fetch collection to get brand_id
            collection_ref = self.db.collection('collections').document(collection_id)
            collection_doc = collection_ref.get()
            
            if not collection_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Collection {collection_id} not found"
                )
            
            collection_data = collection_doc.to_dict()
            brand_id = collection_data.get('brand_id')
            
            if not brand_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Collection does not have a brand_id"
                )
            
            logger.info(f"Extracting images from PDF for collection {collection_id}, document {document_id}")
            
            # Extract images using PyMuPDF (reuse existing parser method)
            images = self.parser_service._extract_images_with_pymupdf(file_bytes)
            logger.info(f"Extracted {len(images)} images from PDF")
            
            if not images:
                logger.warning("No images found in PDF")
                return []
            
            # Upload images to Firebase Storage with proper path structure
            uploaded_images = await self.storage_service.upload_document_images(
                images=images,
                brand_id=brand_id,
                collection_id=collection_id,
                document_id=document_id
            )
            
            logger.info(f"Uploaded {len(uploaded_images)} images to Firebase Storage")
            
            # Format images for our use (add center point, clean up metadata)
            formatted_images = []
            for img in uploaded_images:
                bbox = img.get('bbox', [0, 0, 0, 0])
                formatted_images.append({
                    'page_number': img.get('page'),
                    'image_index': img.get('index'),
                    'bbox': {
                        'x0': bbox[0],
                        'y0': bbox[1],
                        'x1': bbox[2],
                        'y1': bbox[3],
                        'width': img.get('width', bbox[2] - bbox[0]),
                        'height': img.get('height', bbox[3] - bbox[1])
                    },
                    'center': {
                        'x': (bbox[0] + bbox[2]) / 2,
                        'y': (bbox[1] + bbox[3]) / 2
                    },
                    'storage_path': img.get('storage_path'),
                    'url': img.get('url'),
                    'format': img.get('format'),
                    'size': img.get('size')
                })
            
            return formatted_images
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error extracting images from PDF: {e}")
            # Don't fail the entire upload if image extraction fails
            return []
    
    async def _extract_structured_products(
        self,
        normalized_text: str,
        collection_id: str,
        document_id: str,
        categories: List[Dict[str, Any]] = None,
        progress_callback=None
    ) -> List[Dict[str, Any]]:
        """
        Extract structured product data from line sheet using chunked LLM extraction.

        Args:
            normalized_text: Normalized text from line sheet
            collection_id: Collection ID for Firestore updates
            document_id: Document ID for Firestore updates
            categories: Optional list of category objects for product categorization
            progress_callback: Optional async callback for progress/ETA updates

        Returns:
            List of unique structured product dictionaries
        """
        try:
            logger.info("Extracting structured products from line sheet using chunked approach")

            # Step 1: Create large chunks using custom chunker
            chunks = self._create_large_chunks(
                text=normalized_text,
                chunk_size=10000,
                overlap=1000
            )
            logger.info(f"Split text into {len(chunks)} chunks")

            # Signal Phase 5 start (ETA carried automatically by callback)
            if progress_callback:
                await progress_callback(phase=5, message="Extracting products")

            # Step 2: Process each chunk
            all_products = []
            doc_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents').document(document_id)

            for i, chunk_text in enumerate(chunks):

                # Extract products from this chunk
                chunk_products = await self._extract_products_from_chunk(
                    chunk_text,
                    i + 1,
                    len(chunks),
                    categories
                )

                if chunk_products:
                    all_products.extend(chunk_products)

                    # Step 3: Update Firestore progressively
                    doc_ref.update({
                        'structured_products': all_products,
                        'extraction_progress': {
                            'current_chunk': i + 1,
                            'total_chunks': len(chunks),
                            'products_so_far': len(all_products)
                        },
                        'updated_at': datetime.utcnow()
                    })

                    logger.info(f"Progress: {len(all_products)} products extracted from {i+1}/{len(chunks)} chunks")
            
            # Step 4: Deduplicate products
            unique_products = self._deduplicate_products(all_products)
            
            # Step 5: Final Firestore update
            doc_ref.update({
                'structured_products': unique_products,
                'extraction_progress': None,  # Clear progress indicator
                'updated_at': datetime.utcnow()
            })
            
            logger.info(f"Extraction complete: {len(unique_products)} unique products from {len(chunks)} chunks")
            return unique_products
            
        except Exception as e:
            logger.error(f"Error extracting structured products: {e}")
            return []
    
    async def _extract_products_from_chunk(
        self, 
        chunk_text: str, 
        chunk_num: int, 
        total_chunks: int,
        categories: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract products from a single chunk using LLM.
        
        Args:
            chunk_text: Text from one chunk
            chunk_num: Current chunk number (1-indexed)
            total_chunks: Total number of chunks
            categories: Optional list of category objects for product categorization
            
        Returns:
            List of products extracted from this chunk
        """
        try:
            logger.info(f"Extracting products from chunk {chunk_num}/{total_chunks} ({len(chunk_text)} chars)")
            
            system_message = """You are a fashion industry data extraction expert.
Extract products from this line sheet section.
Return ONLY valid JSON with no additional text."""
            
            # Build category list for prompt
            category_list = []
            if categories:
                for cat in categories:
                    subcats = [sub['name'] for sub in cat.get('subcategories', [])]
                    if subcats:
                        category_list.append(f"- {cat['name']}: {', '.join(subcats)}")
                    else:
                        category_list.append(f"- {cat['name']}")
            
            categories_text = "\n".join(category_list) if category_list else "No categories defined"
            
            prompt = f"""Extract ALL products from this line sheet section (chunk {chunk_num}/{total_chunks}).

**Available Categories:**
{categories_text}

Return JSON:
{{
  "products": [
    {{
      "sku": "base SKU or style number",
      "product_name": "product name",
      "category": "assigned category from list above",
      "subcategory": "assigned subcategory (if applicable) or null",
      "colors": [
        {{
          "color_name": "color name",
          "color_code": "color code (if available)"
        }}
      ],
      "wholesale_price": numeric value or null,
      "rrp": numeric retail price or null,
      "currency": "USD/EUR/GBP etc or null",
      "origin": "country (if available)",
      "materials": ["material 1", "material 2"] or []
    }}
  ]
}}

Rules:
- Extract ALL products in this section
- If a product seems incomplete (cut off at chunk boundary), still include it
- If a field is not found, use null or empty array
- For colors, extract all color variants
- Prices should be numeric (no currency symbols)

**Category Assignment Rules:**
- Assign each product to the MOST appropriate category from the list above
- If the category has subcategories, assign the most specific subcategory
- If the category has NO subcategories, set subcategory to null
- If no category fits, set category to null

Line sheet section:
{chunk_text}"""

            # Call LLM
            result = await llm_service.generate_json_completion(
                prompt=prompt,
                system_message=system_message,
                temperature=0.0,
                max_tokens=16384
            )
            
            products = result.get('products', [])
            logger.info(f"Chunk {chunk_num}: Extracted {len(products)} products")
            
            return products
            
        except Exception as e:
            logger.error(f"Error extracting from chunk {chunk_num}: {e}")
            return []
    
    def _deduplicate_products(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate products based on SKU and color codes.
        
        Args:
            products: List of products (may contain duplicates from overlaps)
            
        Returns:
            Deduplicated list of products
        """
        seen_keys = set()
        unique_products = []
        
        for product in products:
            sku = product.get('sku')
            if not sku:
                # No SKU, keep it anyway
                unique_products.append(product)
                continue
            
            # Create unique key: sku + sorted color codes
            colors = product.get('colors', [])
            color_codes = [c.get('color_code', '') for c in colors if c.get('color_code')]
            unique_key = f"{sku}:{':'.join(sorted(color_codes))}"
            
            if unique_key not in seen_keys:
                seen_keys.add(unique_key)
                unique_products.append(product)
            else:
                logger.debug(f"Skipping duplicate: {sku}")
        
        logger.info(f"Deduplication: {len(products)} -> {len(unique_products)} products")
        return unique_products


# Global collection document service instance
collection_document_service = CollectionDocumentService()
