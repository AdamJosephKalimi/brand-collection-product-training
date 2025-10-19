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
        document_data: CollectionDocumentCreate
    ) -> CollectionDocumentResponse:
        """
        Upload a document to Firebase Storage and create Firestore record.
        
        Args:
            collection_id: The parent collection ID
            user_id: The authenticated user's ID
            file: The uploaded file
            document_data: Document metadata
            
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
                "uploaded_by": user_id,
                "uploaded_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Save to Firestore subcollection
            docs_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents')
            doc_ref = docs_ref.document(document_id)
            doc_ref.set(document_doc)
            
            # Parse and store text (synchronous - wait for completion)
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
            
            # Delete from Firebase Storage
            if storage_path:
                await storage_service.delete_file(storage_path)
            
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
        document_type: str
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
        """
        try:
            logger.info(f"Parsing document: {filename}")
            
            # Extract text based on file type
            file_ext = os.path.splitext(filename)[1].lower()
            parsed_text = ""
            
            if file_ext == '.pdf':
                # Parse PDF
                result = await self.parser_service.parse_pdf(file_bytes, filename)
                parsed_text = result.get('extracted_text', '')
                logger.info(f"Parsed PDF {filename}: {len(parsed_text)} characters")
            
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
            
            else:
                logger.warning(f"Unsupported file type for parsing: {file_ext}")
                return
            
            # Normalize text using category generation service
            normalized_text = category_generation_service.normalize_text(parsed_text)
            logger.info(f"Normalized text: {len(normalized_text)} characters")
            
            # Extract structured products for line sheets
            structured_products = None
            if document_type == 'line_sheet' and normalized_text:
                logger.info("Document is a line sheet, extracting structured products...")
                structured_products = await self._extract_structured_products(normalized_text)
            
            # Update document in Firestore
            doc_ref = self.db.collection(self.collections_collection).document(collection_id).collection('documents').document(document_id)
            update_data = {
                'parsed_text': parsed_text,
                'normalized_text': normalized_text,
                'parsed_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            # Add structured products if extracted
            if structured_products is not None:
                update_data['structured_products'] = structured_products
            
            doc_ref.update(update_data)
            
            logger.info(f"Successfully stored parsed text for document {document_id}")
            
        except Exception as e:
            logger.error(f"Error parsing and storing text for document {document_id}: {e}")
            # Don't raise - parsing failure shouldn't block document upload
    
    async def _extract_structured_products(self, normalized_text: str) -> List[Dict[str, Any]]:
        """
        Extract structured product data from line sheet using LLM.
        
        Args:
            normalized_text: Normalized text from line sheet
            
        Returns:
            List of structured product dictionaries
        """
        try:
            logger.info("Extracting structured products from line sheet using LLM")
            
            # Create prompt for LLM
            system_message = """You are a fashion industry data extraction expert.
Your task is to parse line sheet documents and extract structured product information.
Return ONLY valid JSON with no additional text."""
            
            prompt = f"""Parse this line sheet and extract ALL products in the following JSON format:

{{
  "products": [
    {{
      "sku": "base SKU or style number",
      "product_name": "product name",
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
- Extract ALL products from the line sheet
- If a field is not found, use null or empty array
- For colors, extract all color variants for each product
- Prices should be numeric (no currency symbols)
- Keep descriptions brief
- Be thorough - don't skip products

Line sheet text:
{normalized_text}"""

            # Call LLM (uses configured model from llm_service)
            result = await llm_service.generate_json_completion(
                prompt=prompt,
                system_message=system_message,
                temperature=0.0,  # Deterministic
                max_tokens=16384  # Maximum for gpt-4o-mini
            )
            
            # Extract products array
            products = result.get('products', [])
            logger.info(f"Extracted {len(products)} products from line sheet")
            
            return products
            
        except Exception as e:
            logger.error(f"Error extracting structured products: {e}")
            return []


# Global collection document service instance
collection_document_service = CollectionDocumentService()
