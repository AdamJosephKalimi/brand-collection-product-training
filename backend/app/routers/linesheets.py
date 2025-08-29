from fastapi import APIRouter, HTTPException
from typing import Any, Dict
from pydantic import ValidationError
import json

from ..models.linesheet import LineSheetModel, ValidationResponse

router = APIRouter(prefix="/api/linesheets", tags=["linesheets"])


@router.post("/validate", response_model=ValidationResponse)
async def validate_linesheet(data: Dict[str, Any]):
    """
    Validate line sheet JSON data against schema.
    Returns validation status, errors, and normalized data.
    """
    try:
        # Parse and validate the linesheet data
        linesheet = LineSheetModel(**data)
        
        return ValidationResponse(
            valid=True,
            errors=[],
            normalized=linesheet,
            item_count=len(linesheet.items)
        )
    
    except ValidationError as e:
        # Extract validation errors
        errors = []
        for error in e.errors():
            field_path = " -> ".join(str(loc) for loc in error["loc"])
            error_msg = f"{field_path}: {error['msg']}"
            errors.append(error_msg)
        
        return ValidationResponse(
            valid=False,
            errors=errors,
            normalized=None,
            item_count=None
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON format: {str(e)}"
        )
