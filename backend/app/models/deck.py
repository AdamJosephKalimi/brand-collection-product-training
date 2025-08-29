from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from enum import Enum


class DeckStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    ERROR = "error"


class GenerateRequest(BaseModel):
    brand: str
    season: Optional[str] = None
    sections: List[str]
    linesheet: Dict[str, Any]


class DeckMeta(BaseModel):
    brand: str
    season: Optional[str]
    slides: int
    sections: List[str]
    generated_at: str


class GenerateResponse(BaseModel):
    deckId: str
    status: DeckStatus


class DeckStatusResponse(BaseModel):
    deckId: str
    status: DeckStatus
    previewUrl: Optional[str] = None
    meta: Optional[DeckMeta] = None
    error: Optional[str] = None
