"""
Embedding Service for generating text embeddings using OpenAI API with batch processing.
"""
import os
import time
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import tiktoken
from openai import OpenAI, RateLimitError, APIError, APIConnectionError, APITimeoutError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
import logging
from fastapi import HTTPException

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class EmbeddingCost:
    """Track embedding generation costs"""
    total_tokens: int = 0
    total_requests: int = 0
    total_batches: int = 0
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    
    @property
    def total_cost_usd(self) -> float:
        """Calculate total cost in USD for text-embedding-3-small"""
        # $0.02 per 1M tokens
        return (self.total_tokens / 1_000_000) * 0.02
    
    @property
    def processing_time_seconds(self) -> float:
        """Calculate total processing time"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return (datetime.now() - self.start_time).total_seconds()

class EmbeddingService:
    """Service for generating embeddings with OpenAI API"""
    
    # OpenAI model configuration
    MODEL = "text-embedding-3-small"  # 1536 dimensions, $0.02 per 1M tokens
    MODEL_DIMENSIONS = 1536
    MAX_BATCH_SIZE = 2048  # OpenAI max batch size
    MAX_TOKENS_PER_REQUEST = 8191  # Model's context window
    
    # Rate limiting configuration
    MAX_RETRIES = 3
    INITIAL_WAIT = 1  # seconds
    MAX_WAIT = 60  # seconds
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize embedding service.
        
        Args:
            api_key: OpenAI API key (defaults to environment variable)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        
        self.client = OpenAI(api_key=self.api_key)
        self.encoding = tiktoken.encoding_for_model(self.MODEL)
        
        # Cost tracking
        self.session_cost = EmbeddingCost()
        self.historical_costs: List[EmbeddingCost] = []
    
    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text using tiktoken.
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Number of tokens
        """
        return len(self.encoding.encode(text))
    
    def prepare_batches(self, texts: List[str]) -> List[List[Tuple[int, str]]]:
        """
        Prepare texts for batch processing, respecting token limits.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of batches, each containing (index, text) tuples
        """
        batches = []
        current_batch = []
        current_tokens = 0
        
        for idx, text in enumerate(texts):
            # Count tokens for this text
            text_tokens = self.count_tokens(text)
            
            # Skip texts that are too long
            if text_tokens > self.MAX_TOKENS_PER_REQUEST:
                logger.warning(f"Text at index {idx} exceeds token limit ({text_tokens} tokens), truncating")
                # Truncate the text to fit
                text = self.encoding.decode(self.encoding.encode(text)[:self.MAX_TOKENS_PER_REQUEST])
                text_tokens = self.MAX_TOKENS_PER_REQUEST
            
            # Check if adding this text would exceed batch limits
            if (len(current_batch) >= self.MAX_BATCH_SIZE or 
                (current_tokens + text_tokens > self.MAX_TOKENS_PER_REQUEST * 100)):  # Conservative limit
                # Save current batch and start new one
                if current_batch:
                    batches.append(current_batch)
                current_batch = [(idx, text)]
                current_tokens = text_tokens
            else:
                current_batch.append((idx, text))
                current_tokens += text_tokens
        
        # Add final batch
        if current_batch:
            batches.append(current_batch)
        
        return batches
    
    @retry(
        retry=retry_if_exception_type((RateLimitError, APIConnectionError, APITimeoutError)),
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=INITIAL_WAIT, max=MAX_WAIT),
        before_sleep=before_sleep_log(logger, logging.WARNING)
    )
    async def _generate_embeddings_with_retry(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings with retry logic for rate limiting.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        try:
            response = await asyncio.to_thread(
                self.client.embeddings.create,
                model=self.MODEL,
                input=texts
            )
            
            # Extract embeddings
            embeddings = [item.embedding for item in response.data]
            
            # Update cost tracking
            self.session_cost.total_requests += 1
            self.session_cost.total_tokens += sum(self.count_tokens(text) for text in texts)
            
            return embeddings
            
        except RateLimitError as e:
            logger.warning(f"Rate limit hit: {e}. Retrying...")
            raise
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error generating embeddings: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")
    
    async def generate_embeddings_batch(
        self,
        texts: List[str],
        metadata: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate embeddings for multiple texts in optimized batches.
        
        Args:
            texts: List of texts to embed
            metadata: Optional metadata for each text (e.g., chunk_id)
            
        Returns:
            List of dictionaries with embeddings and metadata
        """
        if not texts:
            return []
        
        # Start cost tracking for this batch
        batch_start = datetime.now()
        
        # Prepare batches
        batches = self.prepare_batches(texts)
        logger.info(f"Processing {len(texts)} texts in {len(batches)} batches")
        
        # Process all batches
        all_embeddings = [None] * len(texts)  # Preserve original order
        
        for batch_idx, batch in enumerate(batches):
            batch_texts = [text for _, text in batch]
            batch_indices = [idx for idx, _ in batch]
            
            logger.info(f"Processing batch {batch_idx + 1}/{len(batches)} with {len(batch_texts)} texts")
            
            try:
                # Generate embeddings with retry logic
                embeddings = await self._generate_embeddings_with_retry(batch_texts)
                
                # Map embeddings back to original indices
                for idx, embedding in zip(batch_indices, embeddings):
                    all_embeddings[idx] = embedding
                
                self.session_cost.total_batches += 1
                
                # Small delay between batches to avoid rate limits
                if batch_idx < len(batches) - 1:
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Failed to process batch {batch_idx + 1}: {e}")
                raise
        
        # Combine embeddings with metadata
        results = []
        for idx, embedding in enumerate(all_embeddings):
            if embedding is None:
                logger.warning(f"No embedding generated for text at index {idx}")
                continue
            
            result = {
                "index": idx,
                "embedding": embedding,
                "dimensions": len(embedding)
            }
            
            # Add metadata if provided
            if metadata and idx < len(metadata):
                result["metadata"] = metadata[idx]
            
            results.append(result)
        
        # Update cost tracking
        self.session_cost.end_time = datetime.now()
        
        logger.info(
            f"Generated {len(results)} embeddings in {self.session_cost.processing_time_seconds:.2f}s "
            f"(Cost: ${self.session_cost.total_cost_usd:.4f})"
        )
        
        return results
    
    async def generate_embeddings_for_chunks(
        self,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate embeddings for text chunks from chunking service.
        
        Args:
            chunks: List of chunk dictionaries with 'text' and metadata
            
        Returns:
            List of chunks with added embedding data
        """
        if not chunks:
            return []
        
        # Extract texts and metadata
        texts = [chunk.get("text", "") for chunk in chunks]
        metadata = [
            {
                "chunk_id": chunk.get("chunk_id"),
                "chunk_index": chunk.get("metadata", {}).get("chunk_index"),
                "document_id": chunk.get("metadata", {}).get("document_id")
            }
            for chunk in chunks
        ]
        
        # Generate embeddings
        embeddings = await self.generate_embeddings_batch(texts, metadata)
        
        # Add embeddings to chunks
        enhanced_chunks = []
        for chunk, embedding_data in zip(chunks, embeddings):
            enhanced_chunk = chunk.copy()
            enhanced_chunk["embedding"] = embedding_data["embedding"]
            enhanced_chunk["embedding_dimensions"] = embedding_data["dimensions"]
            enhanced_chunk["embedding_model"] = self.MODEL
            enhanced_chunks.append(enhanced_chunk)
        
        return enhanced_chunks
    
    def get_cost_report(self) -> Dict[str, Any]:
        """
        Get detailed cost report for current session.
        
        Returns:
            Dictionary with cost metrics
        """
        return {
            "current_session": {
                "total_tokens": self.session_cost.total_tokens,
                "total_requests": self.session_cost.total_requests,
                "total_batches": self.session_cost.total_batches,
                "total_cost_usd": self.session_cost.total_cost_usd,
                "processing_time_seconds": self.session_cost.processing_time_seconds,
                "average_tokens_per_request": (
                    self.session_cost.total_tokens / self.session_cost.total_requests
                    if self.session_cost.total_requests > 0 else 0
                ),
                "start_time": self.session_cost.start_time.isoformat(),
                "end_time": self.session_cost.end_time.isoformat() if self.session_cost.end_time else None
            },
            "model_info": {
                "model": self.MODEL,
                "dimensions": self.MODEL_DIMENSIONS,
                "cost_per_million_tokens": 0.02,
                "max_batch_size": self.MAX_BATCH_SIZE
            }
        }
    
    def reset_cost_tracking(self):
        """Reset cost tracking for new session"""
        if self.session_cost.total_requests > 0:
            self.historical_costs.append(self.session_cost)
        self.session_cost = EmbeddingCost()
    
    async def generate_single_embedding(self, text: str) -> Dict[str, Any]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Dictionary with embedding and metadata
        """
        results = await self.generate_embeddings_batch([text])
        return results[0] if results else None

# Global embedding service instance
embedding_service = None

def get_embedding_service() -> EmbeddingService:
    """Get or create embedding service instance"""
    global embedding_service
    if embedding_service is None:
        embedding_service = EmbeddingService()
    return embedding_service
