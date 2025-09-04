"""
Firebase Storage Service for handling document file operations.
"""
import os
import io
import uuid
from typing import Optional, BinaryIO, Tuple, Dict, Any
from datetime import timedelta
from fastapi import UploadFile, HTTPException
import mimetypes
from .firebase_service import firebase_service

class StorageService:
    """Service for handling Firebase Storage operations"""
    
    def __init__(self):
        self._bucket = firebase_service.bucket
    
    def _generate_storage_path(
        self, 
        brand_id: str, 
        collection_id: str, 
        document_id: str, 
        filename: str,
        path_type: str = "documents"
    ) -> str:
        """
        Generate organized storage path for files.
        
        Args:
            brand_id: Brand identifier
            collection_id: Collection identifier
            document_id: Document identifier
            filename: Original filename
            path_type: Type of path (documents, images, temp)
        
        Returns:
            Formatted storage path
        """
        # Clean filename to avoid path issues
        safe_filename = filename.replace(" ", "_").replace("/", "_")
        
        if path_type == "temp":
            return f"temp/{document_id}/{safe_filename}"
        elif path_type == "images":
            return f"brands/{brand_id}/collections/{collection_id}/documents/{document_id}/images/{safe_filename}"
        else:  # documents
            return f"brands/{brand_id}/collections/{collection_id}/documents/{document_id}/{safe_filename}"
    
    async def upload_file(
        self,
        file: UploadFile,
        brand_id: str,
        collection_id: str,
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to Firebase Storage.
        
        Args:
            file: FastAPI UploadFile object
            brand_id: Brand identifier
            collection_id: Collection identifier
            document_id: Document identifier (auto-generated if not provided)
        
        Returns:
            Dictionary with storage_path, public_url, and metadata
        """
        try:
            # Generate document ID if not provided
            if not document_id:
                document_id = str(uuid.uuid4())
            
            # Read file content
            content = await file.read()
            
            # Generate storage path
            storage_path = self._generate_storage_path(
                brand_id=brand_id,
                collection_id=collection_id,
                document_id=document_id,
                filename=file.filename
            )
            
            # Create blob in Firebase Storage
            blob = self._bucket.blob(storage_path)
            
            # Set content type
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
            if content_type:
                blob.content_type = content_type
            
            # Upload file
            blob.upload_from_string(content, content_type=content_type)
            
            # Make blob publicly accessible (optional - remove for private files)
            # blob.make_public()
            
            # Get public URL (or use signed URL for private files)
            public_url = blob.public_url if blob.public_url else self.generate_signed_url(storage_path)
            
            return {
                "document_id": document_id,
                "storage_path": storage_path,
                "public_url": public_url,
                "filename": file.filename,
                "content_type": content_type,
                "size": len(content),
                "metadata": {
                    "brand_id": brand_id,
                    "collection_id": collection_id,
                    "uploaded_at": blob.time_created.isoformat() if blob.time_created else None
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    async def upload_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        brand_id: str,
        collection_id: str,
        document_id: str,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload raw bytes to Firebase Storage.
        
        Args:
            file_bytes: File content as bytes
            filename: Filename for the upload
            brand_id: Brand identifier
            collection_id: Collection identifier
            document_id: Document identifier
            content_type: MIME type of the content
        
        Returns:
            Dictionary with storage_path and metadata
        """
        try:
            # Generate storage path
            storage_path = self._generate_storage_path(
                brand_id=brand_id,
                collection_id=collection_id,
                document_id=document_id,
                filename=filename
            )
            
            # Create blob
            blob = self._bucket.blob(storage_path)
            
            # Set content type
            if not content_type:
                content_type = mimetypes.guess_type(filename)[0]
            if content_type:
                blob.content_type = content_type
            
            # Upload bytes
            blob.upload_from_string(file_bytes, content_type=content_type)
            
            return {
                "storage_path": storage_path,
                "filename": filename,
                "content_type": content_type,
                "size": len(file_bytes)
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload bytes: {str(e)}")
    
    async def download_file(self, storage_path: str) -> bytes:
        """
        Download a file from Firebase Storage.
        
        Args:
            storage_path: Path to file in Firebase Storage
        
        Returns:
            File content as bytes
        """
        try:
            blob = self._bucket.blob(storage_path)
            
            if not blob.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {storage_path}")
            
            return blob.download_as_bytes()
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")
    
    async def download_to_stream(self, storage_path: str, stream: BinaryIO) -> int:
        """
        Download a file directly to a stream.
        
        Args:
            storage_path: Path to file in Firebase Storage
            stream: Binary stream to write to
        
        Returns:
            Number of bytes downloaded
        """
        try:
            blob = self._bucket.blob(storage_path)
            
            if not blob.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {storage_path}")
            
            blob.download_to_file(stream)
            return blob.size
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download to stream: {str(e)}")
    
    async def delete_file(self, storage_path: str) -> bool:
        """
        Delete a file from Firebase Storage.
        
        Args:
            storage_path: Path to file in Firebase Storage
        
        Returns:
            True if deletion was successful
        """
        try:
            blob = self._bucket.blob(storage_path)
            
            if not blob.exists():
                return False
            
            blob.delete()
            return True
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    
    async def delete_folder(self, folder_path: str) -> int:
        """
        Delete all files in a folder (Firebase Storage doesn't have real folders).
        
        Args:
            folder_path: Path to folder in Firebase Storage
        
        Returns:
            Number of files deleted
        """
        try:
            # Ensure folder path ends with /
            if not folder_path.endswith('/'):
                folder_path += '/'
            
            # List all blobs with the prefix
            blobs = self._bucket.list_blobs(prefix=folder_path)
            
            count = 0
            for blob in blobs:
                blob.delete()
                count += 1
            
            return count
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete folder: {str(e)}")
    
    def generate_signed_url(
        self, 
        storage_path: str, 
        expiration_hours: int = 24,
        method: str = 'GET'
    ) -> str:
        """
        Generate a signed URL for temporary access to a file.
        
        Args:
            storage_path: Path to file in Firebase Storage
            expiration_hours: Hours until URL expires (default 24)
            method: HTTP method for the signed URL (GET, PUT, DELETE)
        
        Returns:
            Signed URL string
        """
        try:
            blob = self._bucket.blob(storage_path)
            
            # Check if blob exists for GET requests
            if method == 'GET' and not blob.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {storage_path}")
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(hours=expiration_hours),
                method=method
            )
            
            return url
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")
    
    async def get_file_metadata(self, storage_path: str) -> Dict[str, Any]:
        """
        Get metadata for a file in Firebase Storage.
        
        Args:
            storage_path: Path to file in Firebase Storage
        
        Returns:
            Dictionary with file metadata
        """
        try:
            blob = self._bucket.blob(storage_path)
            
            if not blob.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {storage_path}")
            
            # Reload to get latest metadata
            blob.reload()
            
            return {
                "name": blob.name,
                "size": blob.size,
                "content_type": blob.content_type,
                "created_at": blob.time_created.isoformat() if blob.time_created else None,
                "updated_at": blob.updated.isoformat() if blob.updated else None,
                "md5_hash": blob.md5_hash,
                "etag": blob.etag,
                "public_url": blob.public_url,
                "media_link": blob.media_link
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get file metadata: {str(e)}")
    
    async def list_files(
        self, 
        prefix: str, 
        max_results: int = 100,
        delimiter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List files in Firebase Storage with a given prefix.
        
        Args:
            prefix: Prefix to filter files (e.g., "brands/brand_id/")
            max_results: Maximum number of results to return
            delimiter: Delimiter for virtual folders (usually "/")
        
        Returns:
            Dictionary with files and prefixes (virtual folders)
        """
        try:
            blobs = self._bucket.list_blobs(
                prefix=prefix,
                max_results=max_results,
                delimiter=delimiter
            )
            
            files = []
            for blob in blobs:
                files.append({
                    "name": blob.name,
                    "size": blob.size,
                    "content_type": blob.content_type,
                    "created_at": blob.time_created.isoformat() if blob.time_created else None
                })
            
            # Get prefixes (virtual folders) if delimiter was used
            prefixes = []
            if delimiter and hasattr(blobs, 'prefixes'):
                prefixes = list(blobs.prefixes)
            
            return {
                "files": files,
                "prefixes": prefixes,
                "count": len(files)
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")
    
    async def move_file(self, source_path: str, destination_path: str) -> bool:
        """
        Move a file from one location to another in Firebase Storage.
        
        Args:
            source_path: Current path of the file
            destination_path: New path for the file
        
        Returns:
            True if move was successful
        """
        try:
            source_blob = self._bucket.blob(source_path)
            
            if not source_blob.exists():
                raise HTTPException(status_code=404, detail=f"Source file not found: {source_path}")
            
            # Copy to new location
            destination_blob = self._bucket.blob(destination_path)
            destination_blob.upload_from_string(
                source_blob.download_as_bytes(),
                content_type=source_blob.content_type
            )
            
            # Delete original
            source_blob.delete()
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to move file: {str(e)}")

# Global storage service instance
storage_service = StorageService()
