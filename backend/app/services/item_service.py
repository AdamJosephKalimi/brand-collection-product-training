"""
Item Service for managing collection item CRUD operations with Firebase.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import HTTPException, status
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import firestore
from ..models.item import Item, ItemCreate, ItemUpdate, ItemResponse
from .firebase_service import firebase_service
import logging

logger = logging.getLogger(__name__)


class ItemService:
    """Service for managing item operations"""
    
    def __init__(self):
        self.db = firebase_service.db
        self.collections_collection = "collections"
    
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
    
    async def update_collection_stats(
        self, 
        collection_id: str, 
        item_id: str, 
        category: str, 
        subcategory: Optional[str],
        operation: str  # 'add' or 'remove'
    ):
        """
        Update collection statistics when items are added or removed.
        
        Args:
            collection_id: Collection ID
            item_id: Item ID
            category: Item category
            subcategory: Item subcategory (optional)
            operation: 'add' or 'remove'
        """
        try:
            collection_ref = self.db.collection(self.collections_collection).document(collection_id)
            collection_doc = collection_ref.get()
            collection_data = collection_doc.to_dict()
            
            # Update items array
            items = collection_data.get('items', [])
            if operation == 'add' and item_id not in items:
                items.append(item_id)
            elif operation == 'remove' and item_id in items:
                items.remove(item_id)
            
            # Update total products count
            stats = collection_data.get('stats', {})
            current_count = stats.get('total_products', 0)
            new_count = current_count + 1 if operation == 'add' else max(0, current_count - 1)
            stats['total_products'] = new_count
            
            # Update categories
            categories = collection_data.get('categories', [])
            category_found = False
            
            for cat in categories:
                if cat['name'] == category:
                    category_found = True
                    # Update category count
                    cat_count = cat.get('product_count', 0)
                    cat['product_count'] = cat_count + 1 if operation == 'add' else max(0, cat_count - 1)
                    
                    # Update subcategory count if provided
                    if subcategory:
                        subcategories = cat.get('subcategories', [])
                        subcat_found = False
                        
                        for subcat in subcategories:
                            if subcat['name'] == subcategory:
                                subcat_found = True
                                subcat_count = subcat.get('product_count', 0)
                                subcat['product_count'] = subcat_count + 1 if operation == 'add' else max(0, subcat_count - 1)
                                break
                        
                        # Create subcategory if it doesn't exist and we're adding
                        if not subcat_found and operation == 'add':
                            subcategories.append({
                                'name': subcategory,
                                'product_count': 1,
                                'display_order': len(subcategories) + 1
                            })
                            cat['subcategories'] = subcategories
                    break
            
            # Create category if it doesn't exist and we're adding
            if not category_found and operation == 'add':
                new_category = {
                    'name': category,
                    'product_count': 1,
                    'display_order': len(categories) + 1,
                    'subcategories': []
                }
                if subcategory:
                    new_category['subcategories'] = [{
                        'name': subcategory,
                        'product_count': 1,
                        'display_order': 1
                    }]
                categories.append(new_category)
            
            # Update collection document
            collection_ref.update({
                'items': items,
                'stats': stats,
                'categories': categories,
                'updated_at': datetime.utcnow()
            })
            
        except Exception as e:
            logger.error(f"Error updating collection stats: {e}")
            # Don't raise exception here to avoid blocking item operations
    
    async def create_item(self, collection_id: str, user_id: str, item_data: ItemCreate) -> ItemResponse:
        """
        Create a new item in a collection.
        
        Args:
            collection_id: The parent collection ID
            user_id: The authenticated user's ID
            item_data: Item creation data
            
        Returns:
            Created item response
            
        Raises:
            HTTPException: If collection not found or creation fails
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Generate item ID
            item_id = str(uuid.uuid4())
            
            # Prepare item document
            item_doc = {
                "item_id": item_id,
                "collection_id": collection_id,
                "product_name": item_data.product_name,
                "sku": item_data.sku,
                "category": item_data.category,
                "subcategory": item_data.subcategory,
                "gender": item_data.gender.value if item_data.gender else None,
                "description": item_data.description,
                "materials": item_data.materials or [],
                "care_instructions": item_data.care_instructions or [],
                "process": item_data.process or [],
                "origin": item_data.origin,
                "wholesale_price": item_data.wholesale_price,
                "rrp": item_data.rrp,
                "currency": item_data.currency.value,
                "highlighted_item": item_data.highlighted_item or False,
                "images": [img.model_dump() for img in (item_data.images or [])],
                "variants": [var.model_dump() for var in (item_data.variants or [])],
                "tags": item_data.tags or [],
                "source_document_id": item_data.source_document_id,
                "extraction_confidence": item_data.extraction_confidence,
                "manual_review": False,
                "reviewed_by": None,
                "reviewed_at": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Save to Firestore subcollection
            items_ref = self.db.collection(self.collections_collection).document(collection_id).collection('items')
            items_ref.document(item_id).set(item_doc)
            
            # Update collection stats
            await self.update_collection_stats(
                collection_id, 
                item_id, 
                item_data.category, 
                item_data.subcategory,
                'add'
            )
            
            # Return response
            return ItemResponse(**item_doc)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating item: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create item: {str(e)}"
            )
    
    async def get_collection_items(
        self, 
        collection_id: str, 
        user_id: str,
        category: Optional[str] = None,
        highlighted_only: bool = False
    ) -> List[ItemResponse]:
        """
        Get all items in a collection with optional filtering.
        
        Args:
            collection_id: The collection ID
            user_id: The authenticated user's ID
            category: Optional category filter
            highlighted_only: If True, only return highlighted items
            
        Returns:
            List of item responses
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Query items subcollection
            items_ref = self.db.collection(self.collections_collection).document(collection_id).collection('items')
            query = items_ref
            
            # Apply filters
            if category:
                query = query.where(filter=FieldFilter('category', '==', category))
            if highlighted_only:
                query = query.where(filter=FieldFilter('highlighted_item', '==', True))
            
            docs = query.stream()
            items = []
            
            for doc in docs:
                item_data = doc.to_dict()
                items.append(ItemResponse(**item_data))
            
            return items
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting collection items: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve items: {str(e)}"
            )
    
    async def get_item(self, collection_id: str, item_id: str, user_id: str) -> ItemResponse:
        """
        Get a specific item by ID.
        
        Args:
            collection_id: The collection ID
            item_id: The item ID to retrieve
            user_id: The authenticated user's ID
            
        Returns:
            Item response
            
        Raises:
            HTTPException: If item not found or user doesn't have access
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Get item document
            item_ref = self.db.collection(self.collections_collection).document(collection_id).collection('items').document(item_id)
            item_doc = item_ref.get()
            
            if not item_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item with ID {item_id} not found"
                )
            
            item_data = item_doc.to_dict()
            return ItemResponse(**item_data)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting item: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve item: {str(e)}"
            )
    
    async def update_item(
        self, 
        collection_id: str, 
        item_id: str, 
        user_id: str, 
        update_data: ItemUpdate
    ) -> ItemResponse:
        """
        Update an item.
        
        Args:
            collection_id: The collection ID
            item_id: The item ID to update
            user_id: The authenticated user's ID
            update_data: Item update data
            
        Returns:
            Updated item response
            
        Raises:
            HTTPException: If item not found or user doesn't have access
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Get current item data
            item_ref = self.db.collection(self.collections_collection).document(collection_id).collection('items').document(item_id)
            item_doc = item_ref.get()
            
            if not item_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item with ID {item_id} not found"
                )
            
            current_item_data = item_doc.to_dict()
            old_category = current_item_data.get('category')
            old_subcategory = current_item_data.get('subcategory')
            
            # Prepare update document
            update_doc = {}
            update_fields = update_data.model_dump(exclude_unset=True, exclude_none=True)
            
            for field, value in update_fields.items():
                if field == "gender" and value:
                    update_doc["gender"] = value.value
                elif field == "currency" and value:
                    update_doc["currency"] = value.value
                elif field == "images" and value:
                    update_doc["images"] = [img.model_dump() for img in value]
                elif field == "variants" and value:
                    update_doc["variants"] = [var.model_dump() for var in value]
                else:
                    update_doc[field] = value
            
            # Always update the updated_at timestamp
            update_doc["updated_at"] = datetime.utcnow()
            
            # Update in Firestore
            item_ref.update(update_doc)
            
            # If category or subcategory changed, update collection stats
            new_category = update_doc.get('category', old_category)
            new_subcategory = update_doc.get('subcategory', old_subcategory)
            
            if new_category != old_category or new_subcategory != old_subcategory:
                # Remove from old category
                await self.update_collection_stats(
                    collection_id, 
                    item_id, 
                    old_category, 
                    old_subcategory,
                    'remove'
                )
                # Add to new category
                await self.update_collection_stats(
                    collection_id, 
                    item_id, 
                    new_category, 
                    new_subcategory,
                    'add'
                )
            
            # Return updated item
            return await self.get_item(collection_id, item_id, user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating item: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update item: {str(e)}"
            )
    
    async def delete_item(self, collection_id: str, item_id: str, user_id: str) -> Dict[str, str]:
        """
        Delete an item from a collection.
        
        Args:
            collection_id: The collection ID
            item_id: The item ID to delete
            user_id: The authenticated user's ID
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If item not found or user doesn't have access
        """
        try:
            # Validate collection ownership
            await self.validate_collection_ownership(collection_id, user_id)
            
            # Get item data before deletion
            item_ref = self.db.collection(self.collections_collection).document(collection_id).collection('items').document(item_id)
            item_doc = item_ref.get()
            
            if not item_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item with ID {item_id} not found"
                )
            
            item_data = item_doc.to_dict()
            category = item_data.get('category')
            subcategory = item_data.get('subcategory')
            
            # Delete item
            item_ref.delete()
            
            # Update collection stats
            await self.update_collection_stats(
                collection_id, 
                item_id, 
                category, 
                subcategory,
                'remove'
            )
            
            return {"message": f"Item {item_id} successfully deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting item: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete item: {str(e)}"
            )


# Global item service instance
item_service = ItemService()
