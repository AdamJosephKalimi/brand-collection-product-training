"""
Firebase Storage Service for handling document file operations.
"""
import os
import io
import uuid
import hashlib
from typing import Optional, BinaryIO, Tuple, Dict, Any, List
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
        storage_path: str
    ) -> str:
        """
        Upload a file to Firebase Storage.
        
        Args:
            file: FastAPI UploadFile object
            storage_path: Full storage path where file should be uploaded
        
        Returns:
            Signed URL for accessing the file
        """
        try:
            # Read file content
            content = await file.read()
            
            # Create blob in Firebase Storage
            blob = self._bucket.blob(storage_path)
            
            # Set content type
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
            if content_type:
                blob.content_type = content_type
            
            # Upload file
            blob.upload_from_string(content, content_type=content_type)
            
            # Generate signed URL for access
            signed_url = self.generate_signed_url(storage_path)
            
            return signed_url
            
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
    
    async def upload_image_bytes(
        self,
        image_bytes: bytes,
        storage_key: str,
        content_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Upload raw image bytes to Firebase Storage with content-hashed key.
        
        Args:
            image_bytes: Raw image bytes
            storage_key: Storage path (e.g., "pdf-images/{sha256}.{ext}")
            content_type: MIME type of the image
            
        Returns:
            Dictionary with storage_url and signed_url
        """
        try:
            blob = self._bucket.blob(storage_key)
            
            # Check if image already exists (deduplication)
            if blob.exists():
                # Image already uploaded, just return URLs
                signed_url = blob.generate_signed_url(
                    expiration=timedelta(hours=24),
                    method='GET'
                )
                return {
                    "storage_url": f"gs://{self._bucket.name}/{storage_key}",
                    "signed_url": signed_url,
                    "deduplicated": True
                }
            
            # Upload new image
            blob.upload_from_string(
                image_bytes,
                content_type=content_type
            )
            
            # Set cache control for CDN optimization
            blob.cache_control = "public, max-age=31536000"  # 1 year
            blob.patch()
            
            # Generate signed URL for access
            signed_url = blob.generate_signed_url(
                expiration=timedelta(hours=24),
                method='GET'
            )
            
            return {
                "storage_url": f"gs://{self._bucket.name}/{storage_key}",
                "signed_url": signed_url,
                "deduplicated": False
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
    
    async def process_and_upload_images(
        self,
        images: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Process extracted images: upload to storage and return metadata with URLs.
        
        Args:
            images: List of image dictionaries with _raw_bytes
            
        Returns:
            List of image metadata with signed URLs (no raw bytes)
        """
        processed_images = []
        
        for image in images:
            try:
                # Extract raw bytes (temporary field)
                raw_bytes = image.pop("_raw_bytes", None)
                
                if raw_bytes:
                    # Upload to Firebase Storage
                    upload_result = await self.upload_image_bytes(
                        image_bytes=raw_bytes,
                        storage_key=image["storage_key"],
                        content_type=image["content_type"]
                    )
                    
                    # Add URLs to image metadata
                    image["storage_url"] = upload_result["storage_url"]
                    image["signed_url"] = upload_result["signed_url"]
                    image["deduplicated"] = upload_result["deduplicated"]
                
                processed_images.append(image)
                
            except Exception as e:
                print(f"Warning: Failed to upload image {image.get('image_id')}: {str(e)}")
                # Still include metadata even if upload failed
                image.pop("_raw_bytes", None)  # Remove raw bytes
                image["upload_error"] = str(e)
                processed_images.append(image)
        
        return processed_images
    
    async def upload_document_images(
        self,
        images: List[Dict[str, Any]],
        brand_id: str,
        collection_id: str,
        document_id: str
    ) -> List[Dict[str, Any]]:
        """
        Upload images for a specific collection document.
        
        Storage path: brands/{brand_id}/collections/{collection_id}/documents/{document_id}/page_X_img_Y.ext
        
        Args:
            images: List of image dictionaries with _raw_bytes from PyMuPDF extraction
            brand_id: Brand ID
            collection_id: Collection ID
            document_id: Document ID
            
        Returns:
            List of image metadata with signed URLs and positions (no raw bytes)
        """
        processed_images = []
        
        for image in images:
            try:
                # Extract raw bytes (temporary field)
                raw_bytes = image.pop("_raw_bytes", None)
                
                if not raw_bytes:
                    continue
                
                # Generate storage path for this document
                filename = image.get("filename", f"page_{image['page']}_img_{image['index']}.{image.get('format', 'png').lower()}")
                storage_path = f"brands/{brand_id}/collections/{collection_id}/documents/{document_id}/{filename}"
                
                # Upload to Firebase Storage
                blob = self._bucket.blob(storage_path)
                content_type = image.get("content_type", "image/png")
                blob.content_type = content_type
                blob.upload_from_string(raw_bytes, content_type=content_type)
                
                # Make blob publicly accessible
                blob.make_public()
                
                # Use public URL (no authentication needed)
                public_url = blob.public_url
                
                # Add storage info to image metadata
                image["storage_path"] = storage_path
                image["url"] = public_url
                image["size"] = len(raw_bytes)
                
                processed_images.append(image)
                
            except Exception as e:
                print(f"Warning: Failed to upload image {image.get('filename')}: {str(e)}")
                # Still include metadata even if upload failed (skip failed images)
                image.pop("_raw_bytes", None)  # Remove raw bytes
                image["upload_error"] = str(e)
                # Don't add to processed_images if upload failed
        
        return processed_images

# Global storage service instance
storage_service = StorageService()
