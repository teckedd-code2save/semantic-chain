export interface VectorStoreConfig {
  type: 'memory' | 'pinecone';
  pineconeConfig?: {
    indexName: string;
    maxConcurrency?: number;
  };
}

export interface DocumentLoaderConfig {
  type: 'web' | 'file' | 'text';
  webConfig?: {
    url: string;
    selector?: string;
  };
  fileConfig?: {
    path: string;
    type: 'pdf' | 'txt' | 'json';
  };
  textConfig?: {
    content: string;
  };
}

export interface RAGConfig {
  llm: {
    model: string;
    temperature: number;
  };
  embeddings: {
    model: string;
  };
  chunking: {
    chunkSize: number;
    chunkOverlap: number;
  };
  vectorStore: VectorStoreConfig;
  documentLoader: DocumentLoaderConfig;
}

export interface RAGResponse {
  answer: string;
  context: string[];
  metadata: {
    retrievedDocs: number;
    processingTime: number;
  };
}