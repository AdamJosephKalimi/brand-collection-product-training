"""
Brand Service for managing brand CRUD operations with Firebase.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import HTTPException, status
from google.cloud.firestore_v1.base_query import FieldFilter
from ..models.brand import Brand, BrandCreate, BrandUpdate, BrandResponse, BrandStatistics
from .firebase_service import firebase_service
import logging

logger = logging.getLogger(__name__)


class BrandService:
    """Service for managing brand operations"""
    
    def __init__(self):
        self.db = firebase_service.db
        self.collection_name = "brands"
    
    async def check_brand_name_exists(self, user_id: str, brand_name: str, exclude_brand_id: Optional[str] = None) -> bool:
        """
        Check if a brand name already exists for a user.
        
        Args:
            user_id: The user ID to check
            brand_name: The brand name to check
            exclude_brand_id: Optional brand ID to exclude from check (for updates)
            
        Returns:
            True if brand name exists, False otherwise
        """
        try:
            brands_ref = self.db.collection(self.collection_name)
            query = brands_ref.where(filter=FieldFilter('owner_id', '==', user_id)) \
                             .where(filter=FieldFilter('name', '==', brand_name))
            
            docs = query.stream()
            for doc in docs:
                # If we're updating, exclude the current brand from the check
                if exclude_brand_id and doc.id == exclude_brand_id:
                    continue
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error checking brand name existence: {e}")
            return False
    
    async def validate_brand_ownership(self, brand_id: str, user_id: str) -> bool:
        """
        Validate that a user owns a specific brand.
        
        Args:
            brand_id: The brand ID to check
            user_id: The user ID to validate
            
        Returns:
            True if user owns the brand, False otherwise
        """
        try:
            doc_ref = self.db.collection(self.collection_name).document(brand_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return False
            
            brand_data = doc.to_dict()
            return brand_data.get('owner_id') == user_id
            
        except Exception as e:
            logger.error(f"Error validating brand ownership: {e}")
            return False
    
    async def create_brand(self, user_id: str, brand_data: BrandCreate) -> BrandResponse:
        """
        Create a new brand for a user.
        
        Args:
            user_id: The authenticated user's ID
            brand_data: Brand creation data
            
        Returns:
            Created brand response
            
        Raises:
            HTTPException: If brand name already exists or creation fails
        """
        try:
            # Check if brand name already exists for this user
            if await self.check_brand_name_exists(user_id, brand_data.name):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Brand name '{brand_data.name}' already exists for this user"
                )
            
            # Generate brand ID
            brand_id = str(uuid.uuid4())
            
            # Prepare brand document
            brand_doc = {
                "brand_id": brand_id,
                "owner_id": user_id,
                "collaborators": [],
                "name": brand_data.name,
                "tagline": brand_data.tagline,
                "description": brand_data.description,
                "logo_url": None,
                "logo_storage_path": None,
                "brand_colors": brand_data.brand_colors.model_dump() if brand_data.brand_colors else None,
                "typography": brand_data.typography.model_dump() if brand_data.typography else None,
                "style_guidelines": brand_data.style_guidelines.model_dump() if brand_data.style_guidelines else None,
                "website_url": str(brand_data.website_url) if brand_data.website_url else None,
                "social_media": brand_data.social_media.model_dump() if brand_data.social_media else None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_accessed": None,
                "is_active": True,
                "subscription_tier": "free",
                "stats": {
                    "total_collections": 0,
                    "total_products": 0,
                    "total_presentations": 0,
                    "total_documents": 0,
                    "storage_used_bytes": 0
                }
            }
            
            # Save to Firestore
            self.db.collection(self.collection_name).document(brand_id).set(brand_doc)
            
            # Return response
            return BrandResponse(
                brand_id=brand_id,
                owner_id=user_id,
                name=brand_doc["name"],
                tagline=brand_doc["tagline"],
                description=brand_doc["description"],
                logo_url=brand_doc["logo_url"],
                brand_colors=brand_data.brand_colors,
                deck_typography=brand_data.deck_typography,
                website_url=brand_doc["website_url"],
                social_media=brand_data.social_media,
                subscription_tier=brand_doc["subscription_tier"],
                stats=BrandStatistics(**brand_doc["stats"]),
                created_at=brand_doc["created_at"],
                updated_at=brand_doc["updated_at"],
                is_active=brand_doc["is_active"]
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating brand: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create brand: {str(e)}"
            )
    
    async def get_user_brands(self, user_id: str) -> List[BrandResponse]:
        """
        Get all brands owned by a user.
        
        Args:
            user_id: The authenticated user's ID
            
        Returns:
            List of brand responses
        """
        try:
            brands_ref = self.db.collection(self.collection_name)
            query = brands_ref.where(filter=FieldFilter('owner_id', '==', user_id)) \
                             .where(filter=FieldFilter('is_active', '==', True))
            
            docs = query.stream()
            brands = []
            
            for doc in docs:
                brand_data = doc.to_dict()
                
                # Generate fresh logo_url from logo_storage_path if it exists
                logo_url = None
                logo_storage_path = brand_data.get("logo_storage_path")
                if logo_storage_path:
                    try:
                        from .storage_service import storage_service
                        logo_url = storage_service.generate_signed_url(logo_storage_path, expiration_hours=24)
                    except Exception as e:
                        logger.warning(f"Failed to generate signed URL for logo: {e}")
                        logo_url = None
                
                brands.append(BrandResponse(
                    brand_id=brand_data["brand_id"],
                    owner_id=brand_data["owner_id"],
                    name=brand_data["name"],
                    tagline=brand_data.get("tagline"),
                    description=brand_data.get("description"),
                    logo_url=logo_url,
                    brand_colors=brand_data.get("brand_colors"),
                    deck_typography=brand_data.get("deck_typography"),
                    website_url=brand_data.get("website_url"),
                    social_media=brand_data.get("social_media"),
                    subscription_tier=brand_data.get("subscription_tier", "free"),
                    stats=BrandStatistics(**brand_data.get("stats", {})) if brand_data.get("stats") else BrandStatistics(),
                    created_at=brand_data.get("created_at", datetime.utcnow()),
                    updated_at=brand_data.get("updated_at", datetime.utcnow()),
                    is_active=brand_data.get("is_active", True)
                ))
            
            return brands
            
        except Exception as e:
            logger.error(f"Error getting user brands: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve brands: {str(e)}"
            )
    
    async def get_brand(self, brand_id: str, user_id: str) -> BrandResponse:
        """
        Get a specific brand by ID.
        
        Args:
            brand_id: The brand ID to retrieve
            user_id: The authenticated user's ID
            
        Returns:
            Brand response
            
        Raises:
            HTTPException: If brand not found or user doesn't have access
        """
        try:
            # Validate ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this brand"
                )
            
            # Get brand document
            doc_ref = self.db.collection(self.collection_name).document(brand_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Brand with ID {brand_id} not found"
                )
            
            brand_data = doc.to_dict()
            
            # Update last accessed
            doc_ref.update({"last_accessed": datetime.utcnow()})
            
            # Generate fresh logo_url from logo_storage_path if it exists
            logo_url = None
            logo_storage_path = brand_data.get("logo_storage_path")
            if logo_storage_path:
                try:
                    from .storage_service import storage_service
                    logo_url = storage_service.generate_signed_url(logo_storage_path, expiration_hours=24)
                except Exception as e:
                    logger.warning(f"Failed to generate signed URL for logo: {e}")
                    logo_url = None
            
            return BrandResponse(
                brand_id=brand_data["brand_id"],
                owner_id=brand_data["owner_id"],
                name=brand_data["name"],
                tagline=brand_data.get("tagline"),
                description=brand_data.get("description"),
                logo_url=logo_url,
                brand_colors=brand_data.get("brand_colors"),
                deck_typography=brand_data.get("deck_typography"),
                website_url=brand_data.get("website_url"),
                social_media=brand_data.get("social_media"),
                subscription_tier=brand_data.get("subscription_tier", "free"),
                stats=BrandStatistics(**brand_data.get("stats", {})) if brand_data.get("stats") else BrandStatistics(),
                created_at=brand_data.get("created_at", datetime.utcnow()),
                updated_at=brand_data.get("updated_at", datetime.utcnow()),
                is_active=brand_data.get("is_active", True)
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting brand: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve brand: {str(e)}"
            )
    
    async def update_brand(self, brand_id: str, user_id: str, update_data: BrandUpdate) -> BrandResponse:
        """
        Update a brand.
        
        Args:
            brand_id: The brand ID to update
            user_id: The authenticated user's ID
            update_data: Brand update data
            
        Returns:
            Updated brand response
            
        Raises:
            HTTPException: If brand not found, user doesn't have access, or name already exists
        """
        try:
            # Validate ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this brand"
                )
            
            # If updating name, check uniqueness
            if update_data.name:
                if await self.check_brand_name_exists(user_id, update_data.name, exclude_brand_id=brand_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Brand name '{update_data.name}' already exists for this user"
                    )
            
            # Prepare update document (only include non-None fields)
            update_doc = {}
            update_fields = update_data.model_dump(exclude_unset=True, exclude_none=True)
            
            for field, value in update_fields.items():
                if field == "brand_colors" and value:
                    update_doc["brand_colors"] = value
                elif field == "typography" and value:
                    update_doc["typography"] = value
                elif field == "style_guidelines" and value:
                    update_doc["style_guidelines"] = value
                elif field == "social_media" and value:
                    update_doc["social_media"] = value
                elif field == "website_url" and value:
                    update_doc["website_url"] = str(value)
                else:
                    update_doc[field] = value
            
            # Always update the updated_at timestamp
            update_doc["updated_at"] = datetime.utcnow()
            
            # Update in Firestore
            doc_ref = self.db.collection(self.collection_name).document(brand_id)
            doc_ref.update(update_doc)
            
            # Return updated brand
            return await self.get_brand(brand_id, user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating brand: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update brand: {str(e)}"
            )
    
    async def delete_brand(self, brand_id: str, user_id: str) -> Dict[str, str]:
        """
        Delete a brand (soft delete by marking as inactive).
        
        Args:
            brand_id: The brand ID to delete
            user_id: The authenticated user's ID
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If brand not found or user doesn't have access
        """
        try:
            # Validate ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this brand"
                )
            
            # Soft delete by marking as inactive
            doc_ref = self.db.collection(self.collection_name).document(brand_id)
            doc_ref.update({
                "is_active": False,
                "updated_at": datetime.utcnow()
            })
            
            # Cascade soft delete all collections under this brand
            collections_ref = self.db.collection("collections")
            collections_query = collections_ref.where(filter=FieldFilter('brand_id', '==', brand_id))
            collection_docs = collections_query.stream()
            
            for col_doc in collection_docs:
                col_doc.reference.update({
                    "is_active": False,
                    "updated_at": datetime.utcnow()
                })
            
            return {"message": f"Brand {brand_id} successfully deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting brand: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete brand: {str(e)}"
            )
    
    async def upload_logo(self, brand_id: str, user_id: str, file) -> Dict[str, str]:
        """
        Upload or replace a brand logo.
        
        Args:
            brand_id: The brand ID
            user_id: The authenticated user's ID
            file: The uploaded logo file
            
        Returns:
            Dictionary with logo_url and logo_storage_path
            
        Raises:
            HTTPException: If brand not found, user doesn't have access, or upload fails
        """
        try:
            # Validate ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this brand"
                )
            
            # Validate file type
            allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file type. Allowed types: PNG, JPG, JPEG, SVG, WEBP"
                )
            
            # Validate file size (5 MB max)
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            max_size = 5 * 1024 * 1024  # 5 MB
            if file_size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File size exceeds maximum of 5 MB"
                )
            
            # Get current brand data
            doc_ref = self.db.collection(self.collection_name).document(brand_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Brand with ID {brand_id} not found"
                )
            
            brand_data = doc.to_dict()
            old_logo_path = brand_data.get('logo_storage_path')
            
            # Delete old logo if exists
            if old_logo_path:
                from .storage_service import storage_service
                try:
                    await storage_service.delete_file(old_logo_path)
                except Exception as e:
                    logger.warning(f"Failed to delete old logo: {e}")
            
            # Get file extension
            from pathlib import Path
            file_extension = Path(file.filename).suffix.lower()
            
            # Upload new logo
            storage_path = f"brands/{brand_id}/assets/logo{file_extension}"
            from .storage_service import storage_service
            logo_url = await storage_service.upload_file(file, storage_path)
            
            # Update brand document - only store the stable path, not the expiring URL
            doc_ref.update({
                "logo_storage_path": storage_path,
                "updated_at": datetime.utcnow()
            })
            
            return {
                "logo_url": logo_url,
                "logo_storage_path": storage_path,
                "message": "Logo uploaded successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading logo: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload logo: {str(e)}"
            )
    
    async def delete_logo(self, brand_id: str, user_id: str) -> Dict[str, str]:
        """
        Delete a brand logo.
        
        Args:
            brand_id: The brand ID
            user_id: The authenticated user's ID
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If brand not found or user doesn't have access
        """
        try:
            # Validate ownership
            if not await self.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this brand"
                )
            
            # Get brand document
            doc_ref = self.db.collection(self.collection_name).document(brand_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Brand with ID {brand_id} not found"
                )
            
            brand_data = doc.to_dict()
            logo_storage_path = brand_data.get('logo_storage_path')
            
            if not logo_storage_path:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No logo found for this brand"
                )
            
            # Delete from storage
            from .storage_service import storage_service
            await storage_service.delete_file(logo_storage_path)
            
            # Update brand document
            doc_ref.update({
                "logo_storage_path": None,
                "updated_at": datetime.utcnow()
            })
            
            return {"message": "Logo deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting logo: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete logo: {str(e)}"
            )


# Global brand service instance
brand_service = BrandService()
