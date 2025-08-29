import os
from typing import Dict, List, Optional
import openai
from dotenv import load_dotenv
import json

from ..models.linesheet import LineSheetModel
from .prompt_builder import PromptBuilder

load_dotenv()


class ContentService:
    """Service for generating AI content using OpenAI."""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        # Use the simpler openai.api_key approach
        openai.api_key = api_key
        self.prompt_builder = PromptBuilder()
    
    async def generate_section_content(
        self, 
        section_type: str, 
        brand_name: str, 
        season: str, 
        linesheet: LineSheetModel
    ) -> Dict:
        """Generate content for a specific section type."""
        
        system_prompt = self.prompt_builder.get_system_prompt()
        
        # Build section-specific prompt
        if section_type == "brand_overview":
            user_prompt = self.prompt_builder.build_brand_overview_prompt(brand_name, season, linesheet)
        elif section_type == "themes":
            user_prompt = self.prompt_builder.build_themes_prompt(brand_name, season, linesheet)
        elif section_type == "faqs":
            user_prompt = self.prompt_builder.build_faqs_prompt(brand_name, linesheet)
        elif section_type == "explainers":
            user_prompt = self.prompt_builder.build_explainers_prompt(brand_name, linesheet)
        else:
            raise ValueError(f"Unknown section type: {section_type}")
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Low temperature for consistent, factual content
                max_tokens=800,   # Reasonable limit for section content
            )
            
            content = response.choices[0].message.content
            
            return {
                "section_type": section_type,
                "markdown": content,
                "tokens_used": response.usage.total_tokens,
                "model": "gpt-3.5-turbo"
            }
            
        except Exception as e:
            raise Exception(f"OpenAI API error for {section_type}: {str(e)}")
    
    async def generate_all_sections(
        self, 
        selected_sections: List[str], 
        brand_name: str, 
        season: str, 
        linesheet: LineSheetModel
    ) -> Dict:
        """Generate content for all selected sections."""
        
        sections_content = {}
        total_tokens = 0
        
        # Generate content for each selected section (except product_overview)
        content_sections = [s for s in selected_sections if s != "product_overview"]
        
        for section_type in content_sections:
            try:
                section_content = await self.generate_section_content(
                    section_type, brand_name, season, linesheet
                )
                sections_content[section_type] = section_content
                total_tokens += section_content["tokens_used"]
                
            except Exception as e:
                sections_content[section_type] = {
                    "section_type": section_type,
                    "markdown": f"Error generating content: {str(e)}",
                    "tokens_used": 0,
                    "model": "error"
                }
        
        # Add product overview section (no AI generation needed)
        if "product_overview" in selected_sections:
            sections_content["product_overview"] = {
                "section_type": "product_overview",
                "markdown": "Product overview will be generated from line sheet data",
                "tokens_used": 0,
                "model": "template"
            }
        
        return {
            "sections": sections_content,
            "total_tokens": total_tokens,
            "estimated_cost": self._calculate_cost(total_tokens)
        }
    
    def _calculate_cost(self, tokens: int) -> float:
        """Calculate estimated cost for token usage (GPT-3.5-turbo pricing)."""
        # GPT-3.5-turbo: $0.0015 per 1K input tokens, $0.002 per 1K output tokens
        # Rough estimate assuming 50/50 split
        cost_per_1k = 0.00175  # Average of input/output costs
        return (tokens / 1000) * cost_per_1k
