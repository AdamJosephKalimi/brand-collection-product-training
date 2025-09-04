import os
from typing import List, Dict, Any, Optional
from pinecone import Pinecone
from openai import OpenAI
import uuid
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class PineconeService:
    """Service for managing Pinecone vector operations"""
    
    def __init__(self):
        self.pc = None
        self.index = None
        self.openai_client = None
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize Pinecone and OpenAI clients"""
        try:
            # Initialize Pinecone
            api_key = os.getenv('PINECONE_API_KEY')
            if not api_key:
                raise ValueError("PINECONE_API_KEY not found in environment variables")
            
            self.pc = Pinecone(api_key=api_key)
            
            # Get index
            index_name = os.getenv('PINECONE_INDEX_NAME', 'product-training-embeddings')
            self.index = self.pc.Index(index_name)
            
            # Initialize OpenAI client
            openai_api_key = os.getenv('OPENAI_API_KEY')
            if not openai_api_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
            
            self.openai_client = OpenAI(api_key=openai_api_key)
            
            logger.info("Pinecone and OpenAI clients initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone/OpenAI clients: {e}")
            # Don't raise - allow server to start without Pinecone
            self.pc = None
            self.index = None
            self.openai_client = None
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Pinecone connection and return index stats"""
        try:
            if not self.index:
                return {
                    "status": "error",
                    "error": "Pinecone client not initialized"
                }
            
            # Get index stats and extract only serializable data
            stats = self.index.describe_index_stats()
            serializable_stats = {
                "total_vector_count": getattr(stats, 'total_vector_count', 0),
                "dimension": getattr(stats, 'dimension', 0),
                "index_fullness": getattr(stats, 'index_fullness', 0.0)
            }
            
            # Test embedding generation
            test_embedding = await self.generate_embedding("test connection")
            
            return {
                "status": "success",
                "index_stats": serializable_stats,
                "embedding_dimensions": len(test_embedding),
                "openai_model": "text-embedding-3-small"
            }
        except Exception as e:
            logger.error(f"Pinecone connection test failed: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI text-embedding-3-small"""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
                encoding_format="float"
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    async def upsert_vectors(self, vectors: List[Dict[str, Any]]) -> bool:
        """Upsert vectors to Pinecone index"""
        try:
            # Format vectors for Pinecone
            formatted_vectors = []
            for vector in vectors:
                formatted_vectors.append({
                    "id": vector["id"],
                    "values": vector["embedding"],
                    "metadata": vector.get("metadata", {})
                })
            
            # Upsert to Pinecone
            self.index.upsert(vectors=formatted_vectors)
            logger.info(f"Successfully upserted {len(vectors)} vectors")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert vectors: {e}")
            return False
    
    async def search_similar(
        self, 
        query_text: str, 
        top_k: int = 10,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors using text query"""
        try:
            # Generate embedding for query
            query_embedding = await self.generate_embedding(query_text)
            
            # Search in Pinecone
            search_results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_metadata
            )
            
            # Format results
            results = []
            for match in search_results.matches:
                results.append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search vectors: {e}")
            return []
    
    async def delete_vectors(self, vector_ids: List[str]) -> bool:
        """Delete vectors by IDs"""
        try:
            self.index.delete(ids=vector_ids)
            logger.info(f"Successfully deleted {len(vector_ids)} vectors")
            return True
        except Exception as e:
            logger.error(f"Failed to delete vectors: {e}")
            return False
    
    async def delete_by_metadata(self, filter_metadata: Dict[str, Any]) -> bool:
        """Delete vectors by metadata filter"""
        try:
            self.index.delete(filter=filter_metadata)
            logger.info(f"Successfully deleted vectors with filter: {filter_metadata}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete vectors by metadata: {e}")
            return False
    
    async def store_document_chunks(
        self,
        document_id: str,
        collection_id: str,
        brand_id: str,
        chunks: List[Dict[str, Any]]
    ) -> bool:
        """Store document chunks as vectors"""
        try:
            vectors = []
            
            for i, chunk in enumerate(chunks):
                # Generate embedding for chunk text
                embedding = await self.generate_embedding(chunk["text"])
                
                # Create vector with metadata
                vector = {
                    "id": f"{document_id}_chunk_{i}",
                    "embedding": embedding,
                    "metadata": {
                        "document_id": document_id,
                        "collection_id": collection_id,
                        "brand_id": brand_id,
                        "chunk_index": i,
                        "text": chunk["text"],
                        "page_number": chunk.get("page_number"),
                        "section": chunk.get("section"),
                        "document_type": chunk.get("document_type"),
                        "created_at": chunk.get("created_at")
                    }
                }
                vectors.append(vector)
            
            # Upsert vectors in batches (Pinecone has limits)
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                success = await self.upsert_vectors(batch)
                if not success:
                    return False
            
            logger.info(f"Successfully stored {len(vectors)} chunks for document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store document chunks: {e}")
            return False
    
    async def search_collection_context(
        self,
        collection_id: str,
        query: str,
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for relevant context within a specific collection"""
        filter_metadata = {"collection_id": collection_id}
        return await self.search_similar(query, top_k, filter_metadata)
    
    async def search_brand_context(
        self,
        brand_id: str,
        query: str,
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for relevant context within a specific brand"""
        filter_metadata = {"brand_id": brand_id}
        return await self.search_similar(query, top_k, filter_metadata)

# Global Pinecone service instance
pinecone_service = PineconeService()
