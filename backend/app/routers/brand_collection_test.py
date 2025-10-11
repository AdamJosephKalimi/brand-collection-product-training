"""
Test router for Brand and Collection Management - allows testing via SwaggerUI.
"""
from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any, List, Optional
from ..models.brand import BrandCreate, BrandUpdate, BrandColors, StyleGuidelines, PresentationStyle
from ..models.collection import (
    CollectionCreate, CollectionUpdate, CollectionTheme, 
    CollectionSettings, ProductCategory, Season, CollectionStatus
)
from ..services.brand_service import brand_service
from ..services.collection_service import collection_service
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/api/test",
    tags=["Brand & Collection Test"],
    responses={404: {"description": "Not found"}},
)

# Test data generators
def get_sample_brand_data() -> Dict[str, Any]:
    """Generate sample brand data for testing"""
    return {
        "name": "Test Fashion Brand",
        "tagline": "Elegance Redefined",
        "description": "A luxury fashion brand focusing on sustainable materials",
        "brand_colors": {
            "primary": "#000000",
            "secondary": "#FFFFFF",
            "accent": "#FFD700"
        },
        "style_guidelines": {
            "tone_of_voice": "Sophisticated and modern",
            "target_audience": "Fashion-forward professionals aged 25-45",
            "key_values": ["Sustainability", "Quality", "Innovation"],
            "presentation_style": "modern"
        }
    }

def get_sample_collection_data() -> Dict[str, Any]:
    """Generate sample collection data for testing"""
    return {
        "name": "Spring/Summer 2024",
        "season": "spring_summer",
        "year": 2024,
        "description": "A vibrant collection inspired by Mediterranean summers",
        "theme": {
            "name": "Mediterranean Dreams",
            "mood_board_urls": ["https://example.com/mood1.jpg"],
            "color_palette": ["#0066CC", "#FFE5B4", "#FFFFFF"],
            "keywords": ["coastal", "relaxed", "elegant"],
            "inspiration": "The azure waters and golden beaches of the Mediterranean"
        },
        "categories": [
            {
                "name": "Dresses",
                "product_count": 15,
                "display_order": 1
            },
            {
                "name": "Swimwear",
                "product_count": 10,
                "display_order": 2
            }
        ]
    }

@router.post("/create-test-brand")
async def create_test_brand(
    custom_name: Optional[str] = None,
    include_all_fields: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a test brand with sample data.
    
    **Parameters:**
    - custom_name: Override the default brand name
    - include_all_fields: Include all optional fields in the brand
    
    **Returns:**
    - Created brand with ID and all details
    
    **Use Case:**
    - Quick brand creation for testing collection features
    """
    try:
        sample_data = get_sample_brand_data()
        
        if custom_name:
            sample_data["name"] = custom_name
        
        if not include_all_fields:
            # Minimal brand - just name
            sample_data = {"name": sample_data["name"]}
        
        brand_create = BrandCreate(**sample_data)
        user_id = current_user["uid"]
        
        result = await brand_service.create_brand(user_id, brand_create)
        
        return {
            "success": True,
            "message": "Test brand created successfully",
            "brand": result.model_dump()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test brand: {str(e)}")

@router.post("/create-test-collection/{brand_id}")
async def create_test_collection(
    brand_id: str,
    custom_name: Optional[str] = None,
    include_all_fields: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a test collection for a brand with sample data.
    
    **Parameters:**
    - brand_id: Parent brand ID
    - custom_name: Override the default collection name
    - include_all_fields: Include all optional fields in the collection
    
    **Returns:**
    - Created collection with ID and all details
    
    **Use Case:**
    - Quick collection creation for testing document upload features
    """
    try:
        sample_data = get_sample_collection_data()
        
        if custom_name:
            sample_data["name"] = custom_name
        
        if not include_all_fields:
            # Minimal collection - just name
            sample_data = {"name": sample_data["name"], "brand_id": brand_id}
        else:
            sample_data["brand_id"] = brand_id
        
        collection_create = CollectionCreate(**sample_data)
        user_id = current_user["uid"]
        
        result = await collection_service.create_collection(brand_id, user_id, collection_create)
        
        return {
            "success": True,
            "message": "Test collection created successfully",
            "collection": result.model_dump()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test collection: {str(e)}")

@router.post("/test-brand-collection-workflow")
async def test_brand_collection_workflow(
    brand_name: str = "Test Workflow Brand",
    collection_name: str = "Test Workflow Collection",
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Test the complete brand → collection workflow.
    
    **Workflow:**
    1. Create a brand
    2. Create a collection under that brand
    3. Verify ownership and relationships
    
    **Returns:**
    - Complete workflow results with IDs for further testing
    
    **Use Case:**
    - End-to-end testing of brand/collection hierarchy
    """
    try:
        user_id = current_user["uid"]
        
        # Step 1: Create brand
        brand_create = BrandCreate(name=brand_name)
        brand = await brand_service.create_brand(user_id, brand_create)
        
        # Step 2: Create collection
        collection_create = CollectionCreate(
            brand_id=brand.brand_id,
            name=collection_name,
            season=Season.SPRING_SUMMER,
            year=2024
        )
        collection = await collection_service.create_collection(
            brand.brand_id, 
            user_id, 
            collection_create
        )
        
        # Step 3: Verify relationships
        retrieved_brand = await brand_service.get_brand(brand.brand_id, user_id)
        retrieved_collections = await collection_service.get_brand_collections(brand.brand_id, user_id)
        
        return {
            "success": True,
            "workflow_complete": True,
            "brand": {
                "id": brand.brand_id,
                "name": brand.name,
                "stats": retrieved_brand.stats.model_dump() if retrieved_brand.stats else None
            },
            "collection": {
                "id": collection.collection_id,
                "name": collection.name,
                "brand_id": collection.brand_id
            },
            "verification": {
                "brand_has_collection": len(retrieved_collections) > 0,
                "collection_count": len(retrieved_collections),
                "ownership_validated": True
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow test failed: {str(e)}")

@router.post("/test-ownership-validation")
async def test_ownership_validation(
    brand_id: str,
    collection_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Test ownership validation for brands and collections.
    
    **Parameters:**
    - brand_id: Brand ID to test
    - collection_id: Optional collection ID to test
    
    **Returns:**
    - Ownership validation results
    
    **Use Case:**
    - Verify permission system is working correctly
    """
    try:
        user_id = current_user["uid"]
        
        # Test brand ownership
        owns_brand = await brand_service.validate_brand_ownership(brand_id, user_id)
        
        result = {
            "user_id": user_id,
            "brand_id": brand_id,
            "owns_brand": owns_brand
        }
        
        # Test collection ownership if provided
        if collection_id:
            owns_collection = await collection_service.validate_collection_ownership(collection_id, user_id)
            result["collection_id"] = collection_id
            result["owns_collection"] = owns_collection
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ownership validation test failed: {str(e)}")

@router.post("/test-name-uniqueness")
async def test_name_uniqueness(
    test_type: str = Body(..., description="'brand' or 'collection'"),
    name: str = Body(..., description="Name to test"),
    brand_id: Optional[str] = Body(None, description="Required for collection test"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Test name uniqueness validation.
    
    **Parameters:**
    - test_type: 'brand' or 'collection'
    - name: Name to check for uniqueness
    - brand_id: Required when testing collection names
    
    **Returns:**
    - Whether the name already exists
    
    **Use Case:**
    - Verify uniqueness validation is working
    """
    try:
        user_id = current_user["uid"]
        
        if test_type == "brand":
            exists = await brand_service.check_brand_name_exists(user_id, name)
            return {
                "type": "brand",
                "name": name,
                "exists": exists,
                "can_create": not exists
            }
        elif test_type == "collection":
            if not brand_id:
                raise HTTPException(status_code=400, detail="brand_id required for collection test")
            
            exists = await collection_service.check_collection_name_exists(brand_id, name)
            return {
                "type": "collection",
                "name": name,
                "brand_id": brand_id,
                "exists": exists,
                "can_create": not exists
            }
        else:
            raise HTTPException(status_code=400, detail="test_type must be 'brand' or 'collection'")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Name uniqueness test failed: {str(e)}")

@router.delete("/cleanup-test-data")
async def cleanup_test_data(
    brand_ids: List[str] = Body(..., description="List of brand IDs to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Clean up test brands and their collections.
    
    **Parameters:**
    - brand_ids: List of brand IDs to delete (soft delete)
    
    **Returns:**
    - Cleanup results
    
    **Use Case:**
    - Clean up after testing to avoid clutter
    """
    try:
        user_id = current_user["uid"]
        results = []
        
        for brand_id in brand_ids:
            try:
                # Get collections first
                collections = await collection_service.get_brand_collections(brand_id, user_id)
                
                # Delete collections
                for collection in collections:
                    await collection_service.delete_collection(collection.collection_id, user_id)
                
                # Delete brand
                await brand_service.delete_brand(brand_id, user_id)
                
                results.append({
                    "brand_id": brand_id,
                    "status": "deleted",
                    "collections_deleted": len(collections)
                })
            except Exception as e:
                results.append({
                    "brand_id": brand_id,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "success": True,
            "results": results,
            "total_processed": len(results)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")
