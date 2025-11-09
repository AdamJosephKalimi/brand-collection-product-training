"""
Collection Service for managing collection CRUD operations with Firebase.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import HTTPException, status
from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_admin import firestore
from ..models.collection import (
    Collection, CollectionCreate, CollectionUpdate, CollectionResponse,
    CollectionStatistics, CollectionSettings, CollectionWorkflow,
    CollectionStatus, CollectionVisibility
)
from .firebase_service import firebase_service
from .brand_service import brand_service
import logging

logger = logging.getLogger(__name__)


class CollectionService:
    """Service for managing collection operations"""
    
    def __init__(self):
        self.db = firebase_service.db
        self.collection_name = "collections"
    
    async def check_collection_name_exists(
        self, 
        brand_id: str, 
        collection_name: str, 
        exclude_collection_id: Optional[str] = None
    ) -> bool:
        """
        Check if a collection name already exists for a brand.
        
        Args:
            brand_id: The brand ID to check
            collection_name: The collection name to check
            exclude_collection_id: Optional collection ID to exclude from check (for updates)
            
        Returns:
            True if collection name exists, False otherwise
        """
        try:
            collections_ref = self.db.collection(self.collection_name)
            query = collections_ref.where(filter=FieldFilter('brand_id', '==', brand_id)) \
                                  .where(filter=FieldFilter('name', '==', collection_name))
            
            docs = query.stream()
            for doc in docs:
                # If we're updating, exclude the current collection from the check
                if exclude_collection_id and doc.id == exclude_collection_id:
                    continue
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error checking collection name existence: {e}")
            return False
    
    async def validate_collection_ownership(
        self, 
        collection_id: str, 
        user_id: str
    ) -> bool:
        """
        Validate that a user owns a collection through brand hierarchy.
        
        Args:
            collection_id: The collection ID to check
            user_id: The user ID to validate
            
        Returns:
            True if user owns the collection's brand, False otherwise
        """
        try:
            # Get the collection
            doc_ref = self.db.collection(self.collection_name).document(collection_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return False
            
            collection_data = doc.to_dict()
            brand_id = collection_data.get('brand_id')
            
            if not brand_id:
                return False
            
            # Check if user owns the brand
            return await brand_service.validate_brand_ownership(brand_id, user_id)
            
        except Exception as e:
            logger.error(f"Error validating collection ownership: {e}")
            return False
    
    async def create_collection(
        self, 
        brand_id: str, 
        user_id: str, 
        collection_data: CollectionCreate
    ) -> CollectionResponse:
        """
        Create a new collection for a brand.
        
        Args:
            brand_id: The brand ID (from URL path)
            user_id: The authenticated user's ID
            collection_data: Collection creation data
            
        Returns:
            Created collection response
            
        Raises:
            HTTPException: If brand not owned, name exists, or creation fails
        """
        try:
            # Validate brand ownership
            if not await brand_service.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to create collections for this brand"
                )
            
            # Check if collection name already exists for this brand
            if await self.check_collection_name_exists(brand_id, collection_data.name):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Collection name '{collection_data.name}' already exists for this brand"
                )
            
            # Generate collection ID
            collection_id = str(uuid.uuid4())
            
            # Prepare collection document
            collection_doc = {
                "collection_id": collection_id,
                "brand_id": brand_id,
                "name": collection_data.name,
                "season": collection_data.season,
                "year": collection_data.year,
                "description": collection_data.description,
                "theme": collection_data.theme.model_dump() if collection_data.theme else None,
                "settings": collection_data.settings.model_dump() if collection_data.settings else CollectionSettings().model_dump(),
                "categories": [cat.model_dump() for cat in collection_data.categories] if collection_data.categories else [],
                "items": collection_data.items if collection_data.items else [],
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "published_at": None,
                "status": CollectionStatus.DRAFT.value,
                "visibility": CollectionVisibility.PRIVATE.value,
                "stats": CollectionStatistics().model_dump(),
                "workflow": CollectionWorkflow().model_dump() if collection_data.items else None
            }
            
            # Save to Firestore
            self.db.collection(self.collection_name).document(collection_id).set(collection_doc)
            
            # Update brand statistics
            brand_doc_ref = self.db.collection("brands").document(brand_id)
            brand_doc_ref.update({
                "stats.total_collections": firestore.Increment(1),
                "updated_at": datetime.utcnow()
            })
            
            # Return response using existing get_collection logic
            return await self.get_collection(collection_id, user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create collection: {str(e)}"
            )
    
    async def get_brand_collections(
        self, 
        brand_id: str, 
        user_id: str
    ) -> List[CollectionResponse]:
        """
        Get all collections for a brand.
        
        Args:
            brand_id: The brand ID
            user_id: The authenticated user's ID
            
        Returns:
            List of collection responses
            
        Raises:
            HTTPException: If brand not owned by user
        """
        try:
            # Validate brand ownership
            if not await brand_service.validate_brand_ownership(brand_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this brand's collections"
                )
            
            collections_ref = self.db.collection(self.collection_name)
            query = collections_ref.where(filter=FieldFilter('brand_id', '==', brand_id))
            
            docs = query.stream()
            collections = []
            
            for doc in docs:
                collection_data = doc.to_dict()
                collections.append(CollectionResponse(
                    collection_id=collection_data["collection_id"],
                    brand_id=collection_data["brand_id"],
                    name=collection_data["name"],
                    season=collection_data.get("season"),
                    year=collection_data.get("year"),
                    description=collection_data.get("description"),
                    theme=collection_data.get("theme"),
                    settings=collection_data.get("settings", CollectionSettings().model_dump()),
                    categories=collection_data.get("categories", []),
                    items=collection_data.get("items", []),
                    status=collection_data.get("status", CollectionStatus.DRAFT.value),
                    visibility=collection_data.get("visibility", CollectionVisibility.PRIVATE.value),
                    stats=CollectionStatistics(**collection_data.get("stats", {})) if collection_data.get("stats") else CollectionStatistics(),
                    created_at=collection_data.get("created_at", datetime.utcnow()),
                    updated_at=collection_data.get("updated_at", datetime.utcnow()),
                    published_at=collection_data.get("published_at"),
                    workflow=collection_data.get("workflow")
                ))
            
            return collections
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting brand collections: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve collections: {str(e)}"
            )
    
    async def get_collection(
        self, 
        collection_id: str, 
        user_id: str
    ) -> CollectionResponse:
        """
        Get a specific collection by ID.
        
        Args:
            collection_id: The collection ID to retrieve
            user_id: The authenticated user's ID
            
        Returns:
            Collection response
            
        Raises:
            HTTPException: If collection not found or user doesn't have access
        """
        try:
            # Validate ownership through brand hierarchy
            if not await self.validate_collection_ownership(collection_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this collection"
                )
            
            # Get collection document
            doc_ref = self.db.collection(self.collection_name).document(collection_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Collection with ID {collection_id} not found"
                )
            
            collection_data = doc.to_dict()
            
            return CollectionResponse(
                collection_id=collection_data["collection_id"],
                brand_id=collection_data["brand_id"],
                name=collection_data["name"],
                season=collection_data.get("season"),
                year=collection_data.get("year"),
                description=collection_data.get("description"),
                theme=collection_data.get("theme"),
                settings=collection_data.get("settings", CollectionSettings().model_dump()),
                categories=collection_data.get("categories", []),
                items=collection_data.get("items", []),
                status=collection_data.get("status", CollectionStatus.DRAFT.value),
                visibility=collection_data.get("visibility", CollectionVisibility.PRIVATE.value),
                stats=CollectionStatistics(**collection_data.get("stats", {})) if collection_data.get("stats") else CollectionStatistics(),
                created_at=collection_data.get("created_at", datetime.utcnow()),
                updated_at=collection_data.get("updated_at", datetime.utcnow()),
                published_at=collection_data.get("published_at"),
                workflow=collection_data.get("workflow"),
                intro_slides=collection_data.get("intro_slides")
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting collection: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve collection: {str(e)}"
            )
    
    async def update_collection(
        self, 
        collection_id: str, 
        user_id: str, 
        update_data: CollectionUpdate
    ) -> CollectionResponse:
        """
        Update a collection.
        
        Args:
            collection_id: The collection ID to update
            user_id: The authenticated user's ID
            update_data: Collection update data
            
        Returns:
            Updated collection response
            
        Raises:
            HTTPException: If collection not found, user doesn't have access, or name exists
        """
        try:
            # Validate ownership through brand hierarchy
            if not await self.validate_collection_ownership(collection_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this collection"
                )
            
            # Get current collection to find brand_id
            doc_ref = self.db.collection(self.collection_name).document(collection_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Collection with ID {collection_id} not found"
                )
            
            current_data = doc.to_dict()
            brand_id = current_data["brand_id"]
            
            # If updating name, check uniqueness
            if update_data.name:
                if await self.check_collection_name_exists(brand_id, update_data.name, exclude_collection_id=collection_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Collection name '{update_data.name}' already exists for this brand"
                    )
            
            # Prepare update document (only include non-None fields)
            update_doc = {}
            update_fields = update_data.model_dump(exclude_unset=True, exclude_none=True)
            
            for field, value in update_fields.items():
                if field == "theme" and value:
                    update_doc["theme"] = value
                elif field == "settings" and value:
                    # Use dot notation to merge individual settings fields
                    for setting_key, setting_value in value.items():
                        update_doc[f"settings.{setting_key}"] = setting_value
                elif field == "categories" and value:
                    update_doc["categories"] = [cat if isinstance(cat, dict) else cat.model_dump() for cat in value]
                elif field == "rag_settings" and value:
                    update_doc["rag_settings"] = value
                elif field == "workflow" and value:
                    update_doc["workflow"] = value
                else:
                    update_doc[field] = value
            
            # Always update the updated_at timestamp
            update_doc["updated_at"] = datetime.utcnow()
            
            # Handle status changes
            if "status" in update_doc and update_doc["status"] == CollectionStatus.PUBLISHED.value:
                update_doc["published_at"] = datetime.utcnow()
            
            # Update in Firestore
            doc_ref.update(update_doc)
            
            # Return updated collection
            return await self.get_collection(collection_id, user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating collection: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update collection: {str(e)}"
            )
    
    async def delete_collection(
        self, 
        collection_id: str, 
        user_id: str
    ) -> Dict[str, str]:
        """
        Delete a collection (soft delete by marking status as archived).
        
        Args:
            collection_id: The collection ID to delete
            user_id: The authenticated user's ID
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If collection not found or user doesn't have access
        """
        try:
            # Validate ownership through brand hierarchy
            if not await self.validate_collection_ownership(collection_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this collection"
                )
            
            # Get collection to find brand_id
            doc_ref = self.db.collection(self.collection_name).document(collection_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Collection with ID {collection_id} not found"
                )
            
            collection_data = doc.to_dict()
            brand_id = collection_data["brand_id"]
            
            # Soft delete by marking as archived
            doc_ref.update({
                "status": CollectionStatus.ARCHIVED.value,
                "updated_at": datetime.utcnow()
            })
            
            # Update brand statistics
            brand_doc_ref = self.db.collection("brands").document(brand_id)
            brand_doc_ref.update({
                "stats.total_collections": firestore.Increment(-1),
                "updated_at": datetime.utcnow()
            })
            
            # TODO: In the future, handle cascade operations for documents
            
            return {"message": f"Collection {collection_id} successfully deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting collection: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete collection: {str(e)}"
            )


# Global collection service instance
collection_service = CollectionService()
