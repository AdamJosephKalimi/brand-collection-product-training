"""
Brand Document Service for managing brand document CRUD operations with Firebase.
"""
from typing import List, Dict, Any
from datetime import datetime
import uuid
from pathlib import Path
from fastapi import HTTPException, status, UploadFile
from ..models.brand_document import BrandDocument, BrandDocumentCreate, BrandDocumentUpdate, BrandDocumentResponse
from .firebase_service import firebase_service
from .storage_service import storage_service
from .brand_service import brand_service
from .parser_service import parser_service
from .chunking_service import chunking_service
from .pinecone_service import pinecone_service
import logging

logger = logging.getLogger(__name__)


class BrandDocumentService:
    """Service for managing brand document operations"""
    
    def __init__(self):
        self.db = firebase_service.db
        self.brands_collection = "brands"
    
    async def validate_brand_ownership(self, brand_id: str, user_id: str) -> bool:
        """
        Validate that a user owns a brand.
        
        Args:
            brand_id: The brand ID to check
            user_id: The user ID to validate
            
        Returns:
            True if user owns the brand, False otherwise
        """
        return await brand_service.validate_brand_ownership(brand_id, user_id)
    
    async def upload_document(
        self, 
        brand_id: str, 
        user_id: str, 
        file: UploadFile,
        document_data: BrandDocumentCreate
    ) -> BrandDocumentResponse:
        """
        Upload a document to Firebase Storage and create Firestore record.
        
        Args:
            brand_id: The parent brand ID
            user_id: The authenticated user's ID
            file: The uploaded file
            document_data: Document metadata
            
        Returns:
            Created document response
            
        Raises:
            HTTPException: If brand not found or upload fails
        """
        try:
            # Validate brand ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to upload documents to this brand"
                )
            
            # Generate document ID
            document_id = str(uuid.uuid4())
            
            # Get file extension
            file_extension = Path(file.filename).suffix.lower()
            
            # Upload to Firebase Storage
            storage_path = f"brands/{brand_id}/documents/{document_id}{file_extension}"
            file_url = await storage_service.upload_file(file, storage_path)
            
            # Get file size
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            # Prepare document record
            document_doc = {
                "document_id": document_id,
                "brand_id": brand_id,
                "name": document_data.name,
                "type": document_data.type.value,
                "file_type": file_extension.lstrip('.'),
                "storage_path": storage_path,
                "url": file_url,
                "file_size_bytes": file_size,
                "uploaded_by": user_id,
                "uploaded_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Save to Firestore subcollection
            docs_ref = self.db.collection(self.brands_collection).document(brand_id).collection('documents')
            docs_ref.document(document_id).set(document_doc)
            
            # Update brand stats
            brand_ref = self.db.collection(self.brands_collection).document(brand_id)
            brand_doc = brand_ref.get()
            if brand_doc.exists:
                brand_data = brand_doc.to_dict()
                stats = brand_data.get('stats', {})
                stats['total_brand_documents'] = stats.get('total_brand_documents', 0) + 1
                stats['storage_used_bytes'] = stats.get('storage_used_bytes', 0) + file_size
                brand_ref.update({
                    'stats': stats,
                    'updated_at': datetime.utcnow()
                })
            
            # Return response
            return BrandDocumentResponse(**document_doc)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading brand document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload document: {str(e)}"
            )
    
    async def get_brand_documents(
        self, 
        brand_id: str, 
        user_id: str
    ) -> List[BrandDocumentResponse]:
        """
        Get all documents for a brand.
        
        Args:
            brand_id: The brand ID
            user_id: The authenticated user's ID
            
        Returns:
            List of document responses
        """
        try:
            # Validate brand ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this brand's documents"
                )
            
            # Query documents subcollection
            docs_ref = self.db.collection(self.brands_collection).document(brand_id).collection('documents')
            docs = docs_ref.stream()
            
            documents = []
            for doc in docs:
                doc_data = doc.to_dict()
                documents.append(BrandDocumentResponse(**doc_data))
            
            return documents
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting brand documents: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve documents: {str(e)}"
            )
    
    async def get_document(
        self, 
        brand_id: str, 
        document_id: str, 
        user_id: str
    ) -> BrandDocumentResponse:
        """
        Get a specific document by ID.
        
        Args:
            brand_id: The brand ID
            document_id: The document ID to retrieve
            user_id: The authenticated user's ID
            
        Returns:
            Document response
            
        Raises:
            HTTPException: If document not found or user doesn't have access
        """
        try:
            # Validate brand ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this brand's documents"
                )
            
            # Get document
            doc_ref = self.db.collection(self.brands_collection).document(brand_id).collection('documents').document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with ID {document_id} not found"
                )
            
            doc_data = doc.to_dict()
            return BrandDocumentResponse(**doc_data)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting brand document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve document: {str(e)}"
            )
    
    async def update_document(
        self, 
        brand_id: str, 
        document_id: str, 
        user_id: str, 
        update_data: BrandDocumentUpdate
    ) -> BrandDocumentResponse:
        """
        Update document metadata.
        
        Args:
            brand_id: The brand ID
            document_id: The document ID to update
            user_id: The authenticated user's ID
            update_data: Document update data
            
        Returns:
            Updated document response
            
        Raises:
            HTTPException: If document not found or user doesn't have access
        """
        try:
            # Validate brand ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this brand's documents"
                )
            
            # Get document reference
            doc_ref = self.db.collection(self.brands_collection).document(brand_id).collection('documents').document(document_id)
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
            return await self.get_document(brand_id, document_id, user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating brand document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update document: {str(e)}"
            )
    
    async def process_document(
        self,
        brand_id: str,
        document_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Process a brand document through the RAG pipeline: parse, chunk, embed, store in Pinecone.

        Args:
            brand_id: The brand ID
            document_id: The document ID to process
            user_id: The authenticated user's ID

        Returns:
            Processing stats

        Raises:
            HTTPException: If document not found, user doesn't have access, or processing fails
        """
        try:
            # Validate brand ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to process this brand's documents"
                )

            # Get document record
            doc_ref = self.db.collection(self.brands_collection).document(brand_id).collection('documents').document(document_id)
            doc = doc_ref.get()

            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with ID {document_id} not found"
                )

            doc_data = doc.to_dict()
            storage_path = doc_data.get('storage_path')
            file_type = doc_data.get('file_type', '').lower()

            # Mark as processing
            doc_ref.update({
                'status': 'processing',
                'updated_at': datetime.utcnow()
            })

            # Download file bytes from Firebase Storage
            file_bytes = await storage_service.download_file(storage_path)

            # Parse based on file type
            filename = doc_data.get('name', 'document')
            if file_type == 'pdf':
                parsed = await parser_service.parse_pdf(file_bytes, filename)
            elif file_type == 'docx':
                parsed = await parser_service.parse_docx(file_bytes, filename)
            elif file_type == 'txt':
                parsed = await parser_service.parse_txt(file_bytes, filename)
            else:
                doc_ref.update({
                    'status': 'failed',
                    'updated_at': datetime.utcnow()
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported file type for RAG processing: {file_type}"
                )

            extracted_text = parsed.get('extracted_text', '')

            if not extracted_text.strip():
                doc_ref.update({
                    'status': 'failed',
                    'updated_at': datetime.utcnow()
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No text could be extracted from the document"
                )

            # Chunk the text
            chunks = chunking_service.create_chunks(
                text=extracted_text,
                document_id=document_id
            )

            # Store chunks in Pinecone (generates embeddings internally)
            success = await pinecone_service.store_document_chunks(
                document_id=document_id,
                collection_id="",  # Brand-level docs have no collection
                brand_id=brand_id,
                chunks=chunks
            )

            if not success:
                doc_ref.update({
                    'status': 'failed',
                    'updated_at': datetime.utcnow()
                })
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to store document chunks in vector database"
                )

            # Update Firestore document record with processing results
            doc_ref.update({
                'status': 'processed',
                'chunk_count': len(chunks),
                'parsed_text_preview': extracted_text[:200],
                'updated_at': datetime.utcnow()
            })

            logger.info(f"Successfully processed brand document {document_id}: {len(chunks)} chunks")

            return {
                "document_id": document_id,
                "status": "processed",
                "chunk_count": len(chunks),
                "total_characters": len(extracted_text),
                "parsed_text_preview": extracted_text[:200]
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing brand document: {e}")
            # Try to mark as failed
            try:
                doc_ref = self.db.collection(self.brands_collection).document(brand_id).collection('documents').document(document_id)
                doc_ref.update({
                    'status': 'failed',
                    'updated_at': datetime.utcnow()
                })
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process document: {str(e)}"
            )

    async def delete_document(
        self, 
        brand_id: str, 
        document_id: str, 
        user_id: str
    ) -> Dict[str, str]:
        """
        Delete a document from Firebase Storage and Firestore.
        
        Args:
            brand_id: The brand ID
            document_id: The document ID to delete
            user_id: The authenticated user's ID
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If document not found or user doesn't have access
        """
        try:
            # Validate brand ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this brand's documents"
                )
            
            # Get document data before deletion
            doc_ref = self.db.collection(self.brands_collection).document(brand_id).collection('documents').document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with ID {document_id} not found"
                )
            
            doc_data = doc.to_dict()
            storage_path = doc_data.get('storage_path')
            file_size = doc_data.get('file_size_bytes', 0)
            
            # Delete vectors from Pinecone if document was processed
            if doc_data.get('status') == 'processed':
                try:
                    await pinecone_service.delete_by_metadata({"document_id": document_id})
                    logger.info(f"Deleted Pinecone vectors for document {document_id}")
                except Exception as e:
                    logger.warning(f"Failed to delete Pinecone vectors for document {document_id}: {e}")

            # Delete from Firebase Storage
            if storage_path:
                await storage_service.delete_file(storage_path)

            # Delete from Firestore
            doc_ref.delete()
            
            # Update brand stats
            brand_ref = self.db.collection(self.brands_collection).document(brand_id)
            brand_doc = brand_ref.get()
            if brand_doc.exists:
                brand_data = brand_doc.to_dict()
                stats = brand_data.get('stats', {})
                stats['total_brand_documents'] = max(0, stats.get('total_brand_documents', 0) - 1)
                stats['storage_used_bytes'] = max(0, stats.get('storage_used_bytes', 0) - file_size)
                brand_ref.update({
                    'stats': stats,
                    'updated_at': datetime.utcnow()
                })
            
            return {"message": f"Document {document_id} successfully deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting brand document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete document: {str(e)}"
            )


# Global brand document service instance
brand_document_service = BrandDocumentService()
