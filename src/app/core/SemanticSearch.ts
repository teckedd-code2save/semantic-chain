// Document loaders
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

// Text splitter
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


// Mistral AI embeddings
import { MistralAIEmbeddings } from "@langchain/mistralai";

// In Memory vector store
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { DocumentLoaderConfig } from '../types';
import { DocumentLoaderFactory } from '../loaders/DocumentLoaderFactory';
import { PineconeStore } from '@langchain/pinecone';


// Configuration interface for customizable settings
interface DocumentProcessorConfig {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
}

// Default configuration
const defaultConfig: DocumentProcessorConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: 'mistral-embed',
};

// Predefined query templates for different types of searches
const queryTemplates = {
  experience: {
    jobHistory: "When did I join {company}",
    currentRole: "What is my current position",
    responsibilities: "What are my main responsibilities at {company}",
    achievements: "What achievements or accomplishments are mentioned"
  },
  skills: {
    technical: "What are my technical skills",
    soft: "Name my soft skills",
    programming: "What programming languages do I know",
    tools: "What tools and technologies do I use"
  },
  education: {
    school: "Which school did I attend",
    degree: "What degree do I have",
    graduation: "When did I graduate",
    certifications: "What certifications do I have"
  },
  personal: {
    contact: "What is my contact information",
    location: "Where am I located",
    summary: "What is my professional summary"
  }
};

// Enhanced PDF loader class
class SemanticSearchProcessor {
  private config: DocumentProcessorConfig;
  private vectorStore: MemoryVectorStore |PineconeStore| null = null;
  private documents: Document[] = [];
  private loderConfig: DocumentLoaderConfig;

  constructor(config: Partial<DocumentProcessorConfig> = {},
    loaderConfig: DocumentLoaderConfig) {
    this.config = { ...defaultConfig, ...config };
    this.loderConfig = loaderConfig;
  }

  // Load PDF documents with error handling
  async loadDocuments(): Promise<Document[]> {
    try {
      

      console.log(`📄 Loading file: ${this.loderConfig.fileConfig?.path}`);

      const docs = await DocumentLoaderFactory.loadDocuments(this.loderConfig);
      
      console.log(`✅ Successfully loaded ${docs.length} pages`);
      return docs;
    } catch (error) {
      console.error('❌ Error loading PDF:', error);
      throw error;
    }
  }

  async getEmbeddingsGenerator(): Promise<MistralAIEmbeddings>{
   return new MistralAIEmbeddings({
        model: this.config.embeddingModel
      });
  }

  
  // Process documents with customizable splitting
  async processDocuments(): Promise<void> {
    try {
      // Load PDF documents
      this.documents = await this.loadDocuments();
      
      // Split documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.config.chunkSize,
        chunkOverlap: this.config.chunkOverlap,
      });

      const allSplits = await textSplitter.splitDocuments(this.documents);
      console.log(`📝 Created ${allSplits.length} document chunks`);

      // Create embeddings and vector store
      const embeddingsGenerator = await this.getEmbeddingsGenerator();
      this.vectorStore = new MemoryVectorStore(embeddingsGenerator);

      await this.vectorStore.addDocuments(allSplits);
      console.log('🚀 Vector store created and populated');

    } catch (error) {
      console.error('❌ Error processing documents:', error);
      throw error;
    }
  }

  // Search with similarity scores
  async searchWithScore(query: string, k: number = 3): Promise<[Document, number][]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call processDocuments() first.');
    }

    return await this.vectorStore.similaritySearchWithScore(query, k);
  }

  // Search with similarity scores
  async searchWithVectorsWithScore(query: number[], k: number = 3): Promise<Array<[Document, number]>> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call processDocuments() first.');
    }

    return await this.vectorStore.similaritySearchVectorWithScore(query, k);
  }

  // Simple search without scores
  async search(query: string, k: number = 3): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call processDocuments() first.');
    }

    return await this.vectorStore.similaritySearch(query, k);
  }

  async batchSearchAdvanced(
  queries: string[], 
  options: {
    k?: number;
    strategy?: 'similarity' | 'mmr' | 'threshold';
    mmrLambda?: number;
    scoreThreshold?: number;
    fetchK?: number;
  } = {}
): Promise<{
  results: Record<string, Document[]>;
  metadata: {
    strategy: string;
    totalQueries: number;
    totalResults: number;
    processingTime: number;
  }
}> {
  if (!this.vectorStore) {
    throw new Error('Vector store not initialized. Call processDocuments() first.');
  }

  const startTime = Date.now();
  const {
    k = 2,
    strategy = 'mmr',
    mmrLambda = 0.7,
    fetchK = k * 2
  } = options;

  const results: Record<string, Document[]> = {};
  let retriever: VectorStoreRetriever;

  // Configure retriever based on strategy
  switch (strategy) {
    case 'similarity':
      retriever = this.vectorStore.asRetriever({
        searchType: "similarity",
        k: k
      });
      break;
      
    case 'mmr':
      retriever = this.vectorStore.asRetriever({
        searchType: "mmr",
        searchKwargs: {
          fetchK: fetchK,
          lambda: mmrLambda
        }
      });
      break;
      
      
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }

  try {
    console.log(`🚀 Running batch search with ${strategy} strategy...`);
    
    const batchResults = await retriever.batch(queries);
    
    // Process results
    let totalResults = 0;
    queries.forEach((query, index) => {
      results[query] = batchResults[index] || [];
      totalResults += results[query].length;
      
      console.log(`📋 "${query}": ${results[query].length} results`);
    });

    const processingTime = Date.now() - startTime;
    
    return {
      results,
      metadata: {
        strategy,
        totalQueries: queries.length,
        totalResults,
        processingTime
      }
    };
    
  } catch (error) {
    console.error(`❌ Advanced batch search failed with ${strategy}:`, error);
    throw error;
  }
}

  // Search using predefined templates
  async searchByTemplate(category: keyof typeof queryTemplates, type: string, replacements: Record<string, string> = {}): Promise<Document[]> {
    const template = queryTemplates[category]?.[type as keyof typeof queryTemplates[typeof category]];
    
    if (!template) {
      throw new Error(`Template not found: ${category}.${type}`);
    }

    let query: string = template as string;
    for (const [key, value] of Object.entries(replacements)) {
      query = query.replace(`{${key}}`, value);
    }

    return await this.search(query);
  }

  async  processEmbeddedQueriesWithDetailedLogging(queries:string[]) {
    console.log('🔄 Starting query processing with embeddings...');
    const startTime = Date.now();
    
    const embedder = await this.getEmbeddingsGenerator();

    try {
        // Generate embeddings
        console.log(`📊 Generating embeddings for ${queries.length} queries...`);
        const queryEmbeddings = await embedder.embedDocuments(queries);
        console.log(`✅ Embeddings generated (${queryEmbeddings[0]?.length} dimensions)`);
        
        const allResults = [];
        
        // Process each query
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            const embedding = queryEmbeddings[i];
            
            console.log(`\n${'🔍'.repeat(5)}`);
            console.log(`Query ${i + 1}/${queries.length}: "${query}"`);
            console.log(`${'📄'.repeat(5)}`);
            
            const queryStartTime = Date.now();
            const searchResults = await this.searchWithVectorsWithScore(embedding);
            const queryEndTime = Date.now();
            
            console.log(`⏱️  Search completed in ${queryEndTime - queryStartTime}ms`);
            console.log(`📈 Found ${searchResults.length} results`);
            
            if (searchResults.length > 0) {
                console.log(`🎯 Best match score: ${searchResults[0][1].toFixed(4)}`);
                console.log(`📉 Worst match score: ${searchResults[searchResults.length - 1][1].toFixed(4)}`);
            }
            
            // Display top results
            searchResults.slice(0, 3).forEach((result, resultIndex) => {
                console.log(`\n📄 Result ${resultIndex + 1}:`);
                console.log(`   📊 Score: ${result[1].toFixed(4)}`);
                console.log(`   📝 Preview: ${result[0].pageContent.substring(0, 300)}...`);
                if (result[0].metadata?.source) {
                    console.log(`   📚 Source: ${result[0].metadata.source}`);
                }
            });
            
            allResults.push({
                query,
                resultCount: searchResults.length,
                bestScore: searchResults[0]?.[1] || 0,
                searchTime: queryEndTime - queryStartTime
            });
        }
        
        // Summary statistics
        const totalTime = Date.now() - startTime;
        console.log(`\n${'📊'.repeat(5)}`);
        console.log('PROCESSING SUMMARY');
        console.log(`${'📊'.repeat(5)}`);
        console.log(`⏱️  Total processing time: ${totalTime}ms`);
        console.log(`📈 Average results per query: ${(allResults.reduce((sum, r) => sum + r.resultCount, 0) / allResults.length).toFixed(1)}`);
        console.log(`🎯 Average best score: ${(allResults.reduce((sum, r) => sum + r.bestScore, 0) / allResults.length).toFixed(4)}`);
        
    } catch (error) {
        console.error('❌ Error in detailed processing:', error);
    }
}

  // Get document statistics
  getStats(): { totalPages: number; totalChunks: number; config: DocumentProcessorConfig } {
    return {
      totalPages: this.documents.length,
      totalChunks: this.vectorStore ? Object.keys(this.vectorStore).length : 0,
      config: this.config
    };
  }


}



// Custom query builder helper
class QueryBuilder {
  static experience = {
    joinDate: (company: string) => `When did I start working at ${company}`,
    duration: (company: string) => `How long did I work at ${company}`,
    role: (company: string) => `What was my role at ${company}`,
    achievements: (company: string) => `What did I achieve at ${company}`
  };

  static skills = {
    byCategory: (category: string) => `What ${category} skills do I have`,
    proficiency: (skill: string) => `How proficient am I in ${skill}`,
    experience: (skill: string) => `How much experience do I have with ${skill}`
  };

  static education = {
    institution: (level: string) => `Where did I study ${level}`,
    major: () => `What did I study or major in`,
    year: (degree: string) => `When did I complete my ${degree}`
  };
}

// Export the processor and utilities
export { 
  SemanticSearchProcessor, 
  QueryBuilder, 
  DocumentProcessorConfig,
  defaultConfig,
  queryTemplates, 
};

