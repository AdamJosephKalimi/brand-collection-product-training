"""
LLM Service for GPT-4 integration - handles all AI content generation.
"""
from openai import OpenAI
import os
from typing import Dict, Any, List, Optional
import logging
import json

logger = logging.getLogger(__name__)


class LLMService:
    """Service for GPT-4 content generation"""
    
    def __init__(self):
        self.client = None
        self.model = "gpt-4o-mini"
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize OpenAI client"""
        try:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            
            self.client = OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            self.client = None
    
    async def generate_completion(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[str] = None
    ) -> str:
        """
        Generate a text completion using GPT-4.
        
        Args:
            prompt: The user prompt
            system_message: Optional system message to set context
            temperature: Creativity level (0.0-2.0)
            max_tokens: Maximum response length
            response_format: Optional "json_object" for JSON responses
            
        Returns:
            Generated text content
        """
        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            
            messages = []
            if system_message:
                messages.append({"role": "system", "content": system_message})
            messages.append({"role": "user", "content": prompt})
            
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            if response_format == "json_object":
                kwargs["response_format"] = {"type": "json_object"}
            
            response = self.client.chat.completions.create(**kwargs)
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Failed to generate completion: {e}")
            raise
    
    async def generate_json_completion(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """
        Generate a JSON response using GPT-4.
        
        Args:
            prompt: The user prompt (should request JSON output)
            system_message: Optional system message
            temperature: Creativity level
            max_tokens: Maximum response length
            
        Returns:
            Parsed JSON object
        """
        try:
            content = await self.generate_completion(
                prompt=prompt,
                system_message=system_message,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format="json_object"
            )
            
            return json.loads(content)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Raw content: {content}")
            raise ValueError(f"LLM did not return valid JSON: {e}")
        except Exception as e:
            logger.error(f"Failed to generate JSON completion: {e}")
            raise
    
    async def generate_batch_completions(
        self,
        prompts: List[str],
        system_message: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> List[str]:
        """
        Generate multiple completions in sequence.
        
        Args:
            prompts: List of prompts to process
            system_message: Optional system message for all prompts
            temperature: Creativity level
            max_tokens: Maximum response length per prompt
            
        Returns:
            List of generated responses
        """
        results = []
        for prompt in prompts:
            try:
                result = await self.generate_completion(
                    prompt=prompt,
                    system_message=system_message,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to generate completion for prompt: {e}")
                results.append(None)
        
        return results
    
    async def categorize_items(
        self,
        items: List[Dict[str, Any]],
        categories: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Categorize products using GPT-4.
        
        Args:
            items: List of product items with name, description, etc.
            categories: List of categories with name and subcategories
            
        Returns:
            Items with assigned category and subcategory
        """
        system_message = """You are a fashion product categorization expert. 
Your task is to assign each product to the most appropriate category and subcategory based on the product name and description.
Return a JSON object with the items array, where each item has 'category' and 'subcategory' fields added."""
        
        prompt = f"""Given these categories and subcategories:
{json.dumps(categories, indent=2)}

Categorize these products:
{json.dumps(items, indent=2)}

Return a JSON object with this structure:
{{
  "items": [
    {{
      "item_id": "...",
      "product_name": "...",
      "category": "assigned category name",
      "subcategory": "assigned subcategory name"
    }}
  ]
}}"""
        
        result = await self.generate_json_completion(
            prompt=prompt,
            system_message=system_message,
            temperature=0.3  # Lower temperature for more consistent categorization
        )
        
        return result.get("items", [])
    
    async def generate_intro_slide(
        self,
        slide_type: str,
        brand_info: Dict[str, Any],
        collection_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate content for an intro slide.
        
        Args:
            slide_type: Type of intro slide (cover_page, brand_history, etc.)
            brand_info: Brand information (name, tagline, description, etc.)
            collection_info: Optional collection information
            
        Returns:
            Slide content as JSON
        """
        prompts = {
            "cover_page": f"""Create a cover page slide for a product training presentation.
Brand: {brand_info.get('name')}
Collection: {collection_info.get('name') if collection_info else 'N/A'}
Year: {collection_info.get('year') if collection_info else 'N/A'}

Return JSON with: title, subtitle, tagline""",
            
            "brand_introduction": f"""Create a brand introduction slide.
Brand: {brand_info.get('name')}
Description: {brand_info.get('description', 'N/A')}

Return JSON with: title, introduction_text, key_points (array)""",
            
            "brand_history": f"""Create a brand history slide.
Brand: {brand_info.get('name')}

Return JSON with: title, history_text, timeline (array of key milestones)""",
            
            "brand_values": f"""Create a brand values slide.
Brand: {brand_info.get('name')}

Return JSON with: title, values (array of value objects with name and description)""",
            
            "brand_personality": f"""Create a brand personality slide.
Brand: {brand_info.get('name')}

Return JSON with: title, personality_traits (array), tone_description""",
            
            "flagship_stores": f"""Create a flagship stores and experiences slide.
Brand: {brand_info.get('name')}

Return JSON with: title, stores (array of store objects with location and description)""",
            
            "core_collections": f"""Create a core collections and signature categories slide.
Brand: {brand_info.get('name')}

Return JSON with: title, collections (array of collection objects with name and description)""",
            
            "product_categories": f"""Create a product categories overview slide.
Brand: {brand_info.get('name')}

Return JSON with: title, categories (array of category names), description"""
        }
        
        prompt = prompts.get(slide_type, prompts["cover_page"])
        
        system_message = """You are a fashion industry expert creating professional product training presentations.
Generate compelling, professional content suitable for retail buyers and sales teams.
Always return valid JSON."""
        
        result = await self.generate_json_completion(
            prompt=prompt,
            system_message=system_message,
            temperature=0.7
        )
        
        return result


# Global LLM service instance
llm_service = LLMService()
