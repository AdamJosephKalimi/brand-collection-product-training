from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict
import uuid
from datetime import datetime
import asyncio

from ..models.deck import GenerateRequest, GenerateResponse, DeckStatusResponse, DeckStatus, DeckMeta
from ..models.linesheet import LineSheetModel
from ..services.content_service import ContentService

router = APIRouter(prefix="/api/decks", tags=["decks"])

# In-memory storage for POC (replace with database in production)
deck_registry: Dict[str, Dict] = {}


@router.post("/generate", response_model=GenerateResponse)
async def generate_deck(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Generate a training deck from brand info and linesheet data.
    Returns immediately with deck ID and starts generation in background.
    """
    try:
        # Validate linesheet data
        linesheet = LineSheetModel(**request.linesheet)
        
        # Generate unique deck ID
        deck_id = f"dk_{uuid.uuid4().hex[:8]}"
        
        # Initialize deck registry entry
        deck_registry[deck_id] = {
            "status": DeckStatus.GENERATING,
            "meta": {
                "brand": request.brand,
                "season": request.season or "Current Season",
                "sections": request.sections,
                "generated_at": datetime.now().isoformat()
            },
            "content": None,
            "error": None
        }
        
        # Start background generation
        background_tasks.add_task(
            generate_deck_content,
            deck_id,
            request.brand,
            request.season or "Current Season",
            request.sections,
            linesheet
        )
        
        return GenerateResponse(
            deckId=deck_id,
            status=DeckStatus.GENERATING
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request: {str(e)}"
        )


@router.get("/{deck_id}", response_model=DeckStatusResponse)
async def get_deck_status(deck_id: str):
    """Get the current status of a deck generation."""
    
    if deck_id not in deck_registry:
        raise HTTPException(
            status_code=404,
            detail="Deck not found"
        )
    
    deck_data = deck_registry[deck_id]
    
    response = DeckStatusResponse(
        deckId=deck_id,
        status=deck_data["status"],
        error=deck_data.get("error")
    )
    
    if deck_data["status"] == DeckStatus.READY:
        # Calculate slide count based on sections and content
        slide_count = calculate_slide_count(deck_data["content"], deck_data["meta"]["sections"])
        
        response.meta = DeckMeta(
            brand=deck_data["meta"]["brand"],
            season=deck_data["meta"]["season"],
            slides=slide_count,
            sections=deck_data["meta"]["sections"],
            generated_at=deck_data["meta"]["generated_at"]
        )
        
        # TODO: Add preview URL when file generation is implemented
        # response.previewUrl = f"/files/{deck_id}/preview.pdf"
    
    return response


@router.delete("/{deck_id}")
async def delete_deck(deck_id: str):
    """Clean up deck files and registry entry."""
    
    if deck_id not in deck_registry:
        raise HTTPException(
            status_code=404,
            detail="Deck not found"
        )
    
    # Remove from registry
    del deck_registry[deck_id]
    
    # TODO: Clean up any generated files
    
    return {"message": "Deck deleted successfully"}


async def generate_deck_content(
    deck_id: str,
    brand_name: str,
    season: str,
    sections: list,
    linesheet: LineSheetModel
):
    """Background task to generate deck content using OpenAI."""
    
    try:
        content_service = ContentService()
        
        # Generate AI content for selected sections
        content_result = await content_service.generate_all_sections(
            sections, brand_name, season, linesheet
        )
        
        # Update registry with completed content
        deck_registry[deck_id].update({
            "status": DeckStatus.READY,
            "content": content_result,
            "error": None
        })
        
    except Exception as e:
        # Update registry with error
        deck_registry[deck_id].update({
            "status": DeckStatus.ERROR,
            "content": None,
            "error": str(e)
        })


def calculate_slide_count(content: dict, sections: list) -> int:
    """Calculate estimated slide count based on generated content."""
    if not content:
        return 0
    
    slide_count = 1  # Cover slide
    
    # Add slides for each section
    for section in sections:
        if section == "product_overview":
            # Calculate product slides (3 per slide)
            # This will be implemented with actual linesheet data
            slide_count += 5  # Placeholder
        else:
            # Text content sections (estimate based on content length)
            slide_count += 2  # Placeholder for content sections
    
    return slide_count
