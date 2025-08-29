from typing import List, Optional
from pydantic import BaseModel, Field


class ImageModel(BaseModel):
    url: str
    alt: str


class VariantModel(BaseModel):
    color: str
    sizes: List[str]


class ItemModel(BaseModel):
    id: str = Field(..., description="Required item ID")
    name: str = Field(..., description="Required item name")
    sku: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    gender: Optional[str] = None
    description: Optional[str] = None
    materials: Optional[List[str]] = []
    care: Optional[List[str]] = []
    process: Optional[List[str]] = []
    price: Optional[float] = None
    images: Optional[List[ImageModel]] = []
    variants: Optional[List[VariantModel]] = []
    tags: Optional[List[str]] = []


class LineSheetModel(BaseModel):
    brand: Optional[str] = None
    season: Optional[str] = None
    currency: Optional[str] = "USD"
    items: List[ItemModel] = Field(..., description="Required items array")


class ValidationResponse(BaseModel):
    valid: bool
    errors: List[str] = []
    normalized: Optional[LineSheetModel] = None
    item_count: Optional[int] = None
