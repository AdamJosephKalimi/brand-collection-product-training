from typing import Dict, List, Any
from ..models.linesheet import LineSheetModel


class PromptBuilder:
    """Builds OpenAI prompts for different training deck sections."""
    
    @staticmethod
    def build_brand_overview_prompt(brand_name: str, season: str, linesheet: LineSheetModel) -> str:
        """Generate prompt for brand overview section."""
        categories = set()
        materials = set()
        
        for item in linesheet.items:
            if item.category:
                categories.add(item.category)
            if item.materials:
                materials.update(item.materials)
        
        return f"""You are a retail training copywriter. Using the line sheet metadata below, write a concise brand overview (100–150 words) covering history and personality. Keep claims generic and safe; avoid unverifiable specifics.

Brand: {brand_name}
Season: {season}
Categories: {', '.join(categories) if categories else 'Various'}
Materials: {', '.join(list(materials)[:5]) if materials else 'Various'}

Output format: markdown with a title and 3–5 bullets covering brand personality, target customer, and key differentiators."""

    @staticmethod
    def build_themes_prompt(brand_name: str, season: str, linesheet: LineSheetModel) -> str:
        """Generate prompt for seasonal themes section."""
        categories = [item.category for item in linesheet.items if item.category]
        tags = []
        for item in linesheet.items:
            if item.tags:
                tags.extend(item.tags)
        
        unique_tags = list(set(tags))[:10]  # Limit to top 10 tags
        
        return f"""Based on categories/tags in the line sheet and the provided brand name/season, infer 2–3 plausible seasonal themes and 3 highlights (materials, silhouettes, colors). Avoid specific historical claims.

Brand: {brand_name}
Season: {season}
Categories: {', '.join(set(categories)) if categories else 'Various'}
Key Tags: {', '.join(unique_tags) if unique_tags else 'None'}

Output format: markdown title + bullets for themes and highlights."""

    @staticmethod
    def build_faqs_prompt(brand_name: str, linesheet: LineSheetModel) -> str:
        """Generate prompt for FAQs section."""
        materials = set()
        care_instructions = set()
        
        for item in linesheet.items:
            if item.materials:
                materials.update(item.materials)
            if item.care:
                care_instructions.update(item.care)
        
        return f"""Draft a short FAQ (6–10 Q&A) focused on care, materials, sizing, fabric types, and store-ready talking points. Keep answers 1–2 sentences.

Brand: {brand_name}
Materials found: {', '.join(list(materials)[:5]) if materials else 'Various'}
Care instructions: {', '.join(list(care_instructions)[:3]) if care_instructions else 'Standard care'}

Output format: markdown with Q: and A: format."""

    @staticmethod
    def build_explainers_prompt(brand_name: str, linesheet: LineSheetModel) -> str:
        """Generate prompt for product details explainers."""
        processes = set()
        materials = set()
        
        for item in linesheet.items:
            if item.process:
                processes.update(item.process)
            if item.materials:
                materials.update(item.materials)
        
        # Get unique concepts to explain
        concepts = list(processes.union(materials))[:3]
        
        return f"""Write short explainer blurbs (60–90 words each) for up to 3 processes or material concepts found in the line sheet.

Brand: {brand_name}
Concepts to explain: {', '.join(concepts) if concepts else 'General garment construction'}

For each concept, explain what it is, why it matters, and how it benefits the customer.
Output format: markdown with ## headings for each concept."""

    @staticmethod
    def get_system_prompt() -> str:
        """Get the system prompt for OpenAI."""
        return """You are an expert retail training copywriter specializing in fashion and apparel. Your job is to create clear, concise, and engaging training content for retail sales associates.

Guidelines:
- Keep content factual and avoid unverifiable claims
- Use accessible language that sales associates can easily understand and remember
- Focus on customer benefits and selling points
- Maintain a professional but approachable tone
- Structure content for easy scanning and reference"""
