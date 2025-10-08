"""
Brand Management API Router - CRUD operations for brands.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Dict, Any
from ..models.brand import BrandCreate, BrandUpdate, BrandResponse
from ..services.brand_service import brand_service
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/brands",
    tags=["Brand Management"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    brand_data: BrandCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> BrandResponse:
    """
    Create a new brand for the authenticated user.
    
    **Required:**
    - name: Brand name (1-100 characters)
    
    **Optional:**
    - tagline: Brand tagline (max 200 characters)
    - description: Brand description (max 1000 characters)
    - brand_colors: Primary, secondary, accent colors
    - typography: Font preferences
    - style_guidelines: Tone, audience, values
    - website_url: Brand website
    - social_media: Social media handles
    - contact_info: Contact details
    
    **Validations:**
    - Brand name must be unique per user
    - User is automatically set as owner
    
    **Returns:**
    - Created brand with generated ID and initialized statistics
    """
    try:
        user_id = current_user["uid"]
        return await brand_service.create_brand(user_id, brand_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_brand endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create brand"
        )


@router.get("/", response_model=List[BrandResponse])
async def get_user_brands(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[BrandResponse]:
    """
    Get all brands owned by the authenticated user.
    
    **Returns:**
    - List of active brands owned by the user
    - Sorted by creation date (newest first)
    
    **Note:**
    - Only returns active brands (not deleted)
    - Updates last_accessed timestamp
    """
    try:
        user_id = current_user["uid"]
        return await brand_service.get_user_brands(user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_user_brands endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve brands"
        )


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(
    brand_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> BrandResponse:
    """
    Get a specific brand by ID.
    
    **Parameters:**
    - brand_id: Unique brand identifier
    
    **Validations:**
    - User must own the brand
    
    **Returns:**
    - Brand details including all metadata and statistics
    
    **Errors:**
    - 403: User doesn't own the brand
    - 404: Brand not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_service.get_brand(brand_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_brand endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve brand"
        )


@router.put("/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: str,
    update_data: BrandUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> BrandResponse:
    """
    Update a brand's information.
    
    **Parameters:**
    - brand_id: Unique brand identifier
    
    **Updateable Fields:**
    - All fields from brand creation
    - logo_url and logo_storage_path (for logo updates)
    - subscription_tier (for plan upgrades)
    
    **Validations:**
    - User must own the brand
    - If updating name, must be unique per user
    
    **Returns:**
    - Updated brand with new timestamp
    
    **Errors:**
    - 400: Brand name already exists
    - 403: User doesn't own the brand
    - 404: Brand not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_service.update_brand(brand_id, user_id, update_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_brand endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update brand"
        )


@router.delete("/{brand_id}", response_model=Dict[str, str])
async def delete_brand(
    brand_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a brand (soft delete).
    
    **Parameters:**
    - brand_id: Unique brand identifier
    
    **Behavior:**
    - Marks brand as inactive (soft delete)
    - Brand data is retained but hidden
    - Future: Will cascade delete collections
    
    **Validations:**
    - User must own the brand
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 403: User doesn't own the brand
    - 404: Brand not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_service.delete_brand(brand_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_brand endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete brand"
        )


@router.post("/{brand_id}/logo", response_model=Dict[str, str])
async def upload_brand_logo(
    brand_id: str,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Upload or replace a brand logo.
    
    **Parameters:**
    - brand_id: Brand identifier
    - file: Logo image file
    
    **File Requirements:**
    - Max size: 5 MB
    - Allowed types: PNG, JPG, JPEG, SVG, WEBP
    - Recommended max dimensions: 2000x2000 pixels
    
    **Behavior:**
    - If logo exists, it will be replaced (old logo deleted automatically)
    - Logo stored at: brands/{brand_id}/assets/logo.{ext}
    - Updates brand's logo_url and logo_storage_path
    
    **Validations:**
    - User must own the brand
    - File type must be valid image format
    - File size must not exceed 5 MB
    
    **Returns:**
    - logo_url: Signed URL for accessing the logo
    - logo_storage_path: Storage path in Firebase
    - message: Success message
    
    **Errors:**
    - 400: Invalid file type or size
    - 403: User doesn't own the brand
    - 404: Brand not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_service.upload_logo(brand_id, user_id, file)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_brand_logo endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload logo"
        )


@router.delete("/{brand_id}/logo", response_model=Dict[str, str])
async def delete_brand_logo(
    brand_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a brand logo.
    
    **Parameters:**
    - brand_id: Brand identifier
    
    **Behavior:**
    - Permanently deletes the logo file from Firebase Storage
    - Sets logo_url and logo_storage_path to null in brand document
    - Logo cannot be recovered after deletion
    
    **Validations:**
    - User must own the brand
    - Logo must exist
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 403: User doesn't own the brand
    - 404: Brand or logo not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_service.delete_logo(brand_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_brand_logo endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete logo"
        )
