"""
Test router for Storage Service - allows testing storage operations via SwaggerUI.
This uses dummy brand/collection IDs until the full system is implemented.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional, Dict, Any
import uuid
from ..services.storage_service import storage_service

router = APIRouter(
    prefix="/api/storage-test",
    tags=["Storage Test"],
    responses={404: {"description": "Not found"}},
)

# Dummy IDs for testing - these will be replaced with real brand/collection management later
DUMMY_BRAND_ID = "test-brand-001"
DUMMY_COLLECTION_ID = "test-collection-001"

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    brand_id: Optional[str] = Query(default=DUMMY_BRAND_ID, description="Brand ID (using test default)"),
    collection_id: Optional[str] = Query(default=DUMMY_COLLECTION_ID, description="Collection ID (using test default)"),
    document_id: Optional[str] = Query(default=None, description="Document ID (auto-generated if not provided)")
) -> Dict[str, Any]:
    """
    Upload a document file to Firebase Storage.
    
    This endpoint allows you to test file uploads through SwaggerUI.
    Files will be organized in the structure:
    brands/{brand_id}/collections/{collection_id}/documents/{document_id}/{filename}
    
    Returns:
        - document_id: Unique identifier for the document
        - storage_path: Path where file is stored in Firebase
        - public_url: URL to access the file
        - metadata: Additional file information
    """
    try:
        result = await storage_service.upload_file(
            file=file,
            brand_id=brand_id,
            collection_id=collection_id,
            document_id=document_id
        )
        return {
            "success": True,
            "message": "File uploaded successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download")
async def download_document(
    storage_path: str = Query(..., description="Storage path of the file to download")
) -> Dict[str, Any]:
    """
    Download a file from Firebase Storage.
    
    Provide the storage_path returned from the upload endpoint.
    Note: For large files, this returns the file content as base64 encoded string.
    """
    try:
        file_bytes = await storage_service.download_file(storage_path)
        
        # For API testing, we'll return file info rather than raw bytes
        # In production, you'd return the actual file
        import base64
        return {
            "success": True,
            "message": "File downloaded successfully",
            "data": {
                "storage_path": storage_path,
                "size_bytes": len(file_bytes),
                "content_preview": base64.b64encode(file_bytes[:100]).decode('utf-8') if file_bytes else None,
                "note": "Full content available - showing preview only"
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete")
async def delete_document(
    storage_path: str = Query(..., description="Storage path of the file to delete")
) -> Dict[str, Any]:
    """
    Delete a file from Firebase Storage.
    
    Provide the storage_path of the file you want to delete.
    """
    try:
        success = await storage_service.delete_file(storage_path)
        
        if success:
            return {
                "success": True,
                "message": "File deleted successfully",
                "data": {
                    "storage_path": storage_path
                }
            }
        else:
            return {
                "success": False,
                "message": "File not found or already deleted",
                "data": {
                    "storage_path": storage_path
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete-folder")
async def delete_folder(
    folder_path: str = Query(..., description="Folder path to delete (e.g., 'brands/test-brand-001/collections/test-collection-001/documents/doc-123/')")
) -> Dict[str, Any]:
    """
    Delete all files in a folder from Firebase Storage.
    
    This will delete all files with the given prefix.
    Use with caution as this operation cannot be undone.
    """
    try:
        count = await storage_service.delete_folder(folder_path)
        
        return {
            "success": True,
            "message": f"Deleted {count} files from folder",
            "data": {
                "folder_path": folder_path,
                "files_deleted": count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-signed-url")
async def generate_signed_url(
    storage_path: str = Query(..., description="Storage path of the file"),
    expiration_hours: int = Query(default=24, description="Hours until URL expires"),
    method: str = Query(default="GET", description="HTTP method (GET, PUT, DELETE)")
) -> Dict[str, Any]:
    """
    Generate a signed URL for temporary access to a file.
    
    This creates a time-limited URL that can be shared for file access
    without requiring authentication.
    """
    try:
        signed_url = storage_service.generate_signed_url(
            storage_path=storage_path,
            expiration_hours=expiration_hours,
            method=method
        )
        
        return {
            "success": True,
            "message": "Signed URL generated successfully",
            "data": {
                "storage_path": storage_path,
                "signed_url": signed_url,
                "expires_in_hours": expiration_hours,
                "method": method
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file-metadata")
async def get_file_metadata(
    storage_path: str = Query(..., description="Storage path of the file")
) -> Dict[str, Any]:
    """
    Get metadata for a file in Firebase Storage.
    
    Returns information about file size, content type, creation date, etc.
    """
    try:
        metadata = await storage_service.get_file_metadata(storage_path)
        
        return {
            "success": True,
            "message": "Metadata retrieved successfully",
            "data": metadata
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list-files")
async def list_files(
    prefix: str = Query(default="", description="Prefix to filter files (e.g., 'brands/test-brand-001/')"),
    max_results: int = Query(default=50, description="Maximum number of results"),
    use_delimiter: bool = Query(default=True, description="Use '/' delimiter to show virtual folders")
) -> Dict[str, Any]:
    """
    List files in Firebase Storage with a given prefix.
    
    Use prefix to navigate the storage structure:
    - Empty prefix: List everything
    - 'brands/': List all brand folders
    - 'brands/test-brand-001/': List contents of specific brand
    """
    try:
        delimiter = "/" if use_delimiter else None
        result = await storage_service.list_files(
            prefix=prefix,
            max_results=max_results,
            delimiter=delimiter
        )
        
        return {
            "success": True,
            "message": "Files listed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/move-file")
async def move_file(
    source_path: str = Query(..., description="Current path of the file"),
    destination_path: str = Query(..., description="New path for the file")
) -> Dict[str, Any]:
    """
    Move a file from one location to another in Firebase Storage.
    
    This copies the file to the new location and deletes the original.
    """
    try:
        success = await storage_service.move_file(
            source_path=source_path,
            destination_path=destination_path
        )
        
        if success:
            return {
                "success": True,
                "message": "File moved successfully",
                "data": {
                    "source_path": source_path,
                    "destination_path": destination_path
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to move file")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-connection")
async def test_storage_connection() -> Dict[str, Any]:
    """
    Test the Firebase Storage connection.
    
    This endpoint verifies that the storage service is properly configured
    and can communicate with Firebase.
    """
    try:
        # Try to list files with a very specific prefix that likely doesn't exist
        test_prefix = f"_test_connection_{uuid.uuid4()}/"
        result = await storage_service.list_files(prefix=test_prefix, max_results=1)
        
        return {
            "success": True,
            "message": "Firebase Storage connection successful",
            "data": {
                "service": "Firebase Storage",
                "status": "connected",
                "bucket": "product-training-ai-v1.appspot.com",
                "test_prefix_used": test_prefix
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": "Firebase Storage connection failed",
            "error": str(e)
        }
