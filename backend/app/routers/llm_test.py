"""
Test router for LLM Service - allows testing GPT-4 integration via SwaggerUI.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
from ..services.llm_service import llm_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/llm-test",
    tags=["LLM Test"],
    responses={404: {"description": "Not found"}},
)


@router.post("/generate-text")
async def test_text_generation(
    prompt: str = Body(..., example="Write a brief description of a luxury fashion brand."),
    system_message: str = Body(None, example="You are a fashion industry expert."),
    temperature: float = Body(0.7, ge=0.0, le=2.0),
    max_tokens: int = Body(500, ge=1, le=4000)
) -> Dict[str, Any]:
    """
    Test basic text generation with GPT-4.
    
    **Parameters:**
    - prompt: The text prompt for GPT-4
    - system_message: Optional system message to set context
    - temperature: Creativity level (0.0 = focused, 2.0 = creative)
    - max_tokens: Maximum length of response
    
    **Returns:**
    - Generated text content
    - Token usage info
    """
    try:
        content = await llm_service.generate_completion(
            prompt=prompt,
            system_message=system_message,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return {
            "success": True,
            "content": content,
            "parameters": {
                "temperature": temperature,
                "max_tokens": max_tokens,
                "model": llm_service.model
            }
        }
        
    except Exception as e:
        logger.error(f"Text generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Text generation failed: {str(e)}")


@router.post("/generate-json")
async def test_json_generation(
    prompt: str = Body(
        ..., 
        example='Generate a JSON object with brand information including: name, tagline, and 3 key values.'
    ),
    system_message: str = Body(
        None, 
        example="You are a fashion industry expert. Always return valid JSON."
    ),
    temperature: float = Body(0.7, ge=0.0, le=2.0),
    max_tokens: int = Body(1000, ge=1, le=4000)
) -> Dict[str, Any]:
    """
    Test JSON generation with GPT-4.
    
    **Parameters:**
    - prompt: The prompt requesting JSON output
    - system_message: Optional system message
    - temperature: Creativity level
    - max_tokens: Maximum response length
    
    **Returns:**
    - Parsed JSON object
    - Generation metadata
    
    **Note:** GPT-4 is forced to return valid JSON format.
    """
    try:
        json_content = await llm_service.generate_json_completion(
            prompt=prompt,
            system_message=system_message,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return {
            "success": True,
            "json_content": json_content,
            "parameters": {
                "temperature": temperature,
                "max_tokens": max_tokens,
                "model": llm_service.model
            }
        }
        
    except Exception as e:
        logger.error(f"JSON generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"JSON generation failed: {str(e)}")


@router.post("/generate-intro-slide")
async def test_intro_slide_generation(
    slide_type: str = Body(
        ...,
        example="brand_values",
        description="Type of intro slide: cover_page, brand_introduction, brand_history, brand_values, brand_personality, flagship_stores, core_collections, product_categories"
    ),
    brand_info: Dict[str, Any] = Body(
        ...,
        example={
            "name": "Acme Fashion",
            "description": "A luxury fashion brand known for timeless elegance and sustainable practices.",
            "tagline": "Timeless. Sustainable. Elegant."
        }
    ),
    collection_info: Dict[str, Any] = Body(
        None,
        example={
            "name": "Spring/Summer 2024",
            "year": 2024,
            "type": "Spring/Summer"
        }
    )
) -> Dict[str, Any]:
    """
    Test intro slide content generation.
    
    **Slide Types:**
    - cover_page: Title slide for presentation
    - brand_introduction: Overview of the brand
    - brand_history: Brand timeline and milestones
    - brand_values: Core values and principles
    - brand_personality: Brand character and tone
    - flagship_stores: Store locations and experiences
    - core_collections: Main product collections
    - product_categories: Category overview
    
    **Parameters:**
    - slide_type: Which intro slide to generate
    - brand_info: Brand details (name, description, tagline)
    - collection_info: Optional collection details
    
    **Returns:**
    - Structured slide content as JSON
    """
    try:
        slide_content = await llm_service.generate_intro_slide(
            slide_type=slide_type,
            brand_info=brand_info,
            collection_info=collection_info
        )
        
        return {
            "success": True,
            "slide_type": slide_type,
            "slide_content": slide_content,
            "model": llm_service.model
        }
        
    except Exception as e:
        logger.error(f"Intro slide generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Intro slide generation failed: {str(e)}")


@router.post("/categorize-products")
async def test_product_categorization(
    items: List[Dict[str, Any]] = Body(
        ...,
        example=[
            {
                "item_id": "R13W7020-D345A",
                "sku": "R13W7020",
                "color_code": "D345A",
                "product_name": "Wide Leg Jeans",
                "description": "High-waisted wide leg denim jeans in dark wash"
            },
            {
                "item_id": "R13W8021-B123C",
                "sku": "R13W8021",
                "color_code": "B123C",
                "product_name": "Leather Jacket",
                "description": "Classic biker leather jacket with silver hardware"
            }
        ]
    ),
    categories: List[Dict[str, Any]] = Body(
        ...,
        example=[
            {
                "name": "Denim",
                "subcategories": ["Jeans", "Jackets", "Skirts"]
            },
            {
                "name": "Outerwear",
                "subcategories": ["Jackets", "Coats", "Blazers"]
            },
            {
                "name": "Tops",
                "subcategories": ["T-Shirts", "Blouses", "Sweaters"]
            }
        ]
    )
) -> Dict[str, Any]:
    """
    Test product categorization using GPT-4.
    
    **Parameters:**
    - items: List of products to categorize (with name, description, etc.)
    - categories: Available categories with subcategories
    
    **Returns:**
    - Items with assigned category and subcategory
    
    **Note:** GPT-4 analyzes product names and descriptions to assign the most appropriate category.
    """
    try:
        categorized_items = await llm_service.categorize_items(
            items=items,
            categories=categories
        )
        
        return {
            "success": True,
            "total_items": len(items),
            "categorized_items": categorized_items,
            "model": llm_service.model
        }
        
    except Exception as e:
        logger.error(f"Product categorization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Product categorization failed: {str(e)}")


@router.get("/info")
async def get_llm_info() -> Dict[str, Any]:
    """
    Get information about the LLM service configuration.
    
    **Returns:**
    - Model being used
    - Available methods
    - Configuration details
    """
    return {
        "success": True,
        "model": llm_service.model,
        "available_methods": [
            "generate_completion",
            "generate_json_completion",
            "generate_batch_completions",
            "categorize_items",
            "generate_intro_slide"
        ],
        "intro_slide_types": [
            "cover_page",
            "brand_introduction",
            "brand_history",
            "brand_values",
            "brand_personality",
            "flagship_stores",
            "core_collections",
            "product_categories"
        ],
        "notes": {
            "temperature": "0.0 = focused/deterministic, 2.0 = creative/random",
            "max_tokens": "Maximum length of generated response",
            "json_mode": "Forces valid JSON output for structured data"
        }
    }
