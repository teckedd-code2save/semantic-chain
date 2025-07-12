import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { Embeddings } from "@langchain/core/embeddings";
import { VectorStoreConfig } from "../types";

export class VectorStoreFactory {
  static async createVectorStore(config: VectorStoreConfig, embeddings: Embeddings) {
    switch (config.type) {
      case 'memory':
        return new MemoryVectorStore(embeddings);
      
      case 'pinecone':
        if (!config.pineconeConfig) throw new Error('Pinecone config required for Pinecone store');
        const pinecone = new PineconeClient();
        const pineconeIndex = pinecone.Index(config.pineconeConfig.indexName);
        return new PineconeStore(embeddings, {
          pineconeIndex,
          maxConcurrency: config.pineconeConfig.maxConcurrency || 5,
        });
      
      default:
        throw new Error(`Unsupported vector store type: ${config.type}`);
    }
  }
}