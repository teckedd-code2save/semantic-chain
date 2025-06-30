// Document loaders
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

// Text splitter
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Path and URL utilities
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Mistral AI embeddings
import { MistralAIEmbeddings } from "@langchain/mistralai";

// In Memory vector store
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration interface for customizable settings
interface PDFProcessorConfig {
  pdfFileName: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  documentsPath: string;
}

// Default configuration
const defaultConfig: PDFProcessorConfig = {
  pdfFileName: 'EdwardProffesionalExperience.pdf',
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: 'mistral-embed',
  documentsPath: '../../src/assets/documents'
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
class CustomPDFProcessor {
  private config: PDFProcessorConfig;
  private vectorStore: MemoryVectorStore | null = null;
  private documents: Document[] = [];

  constructor(config: Partial<PDFProcessorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // Load PDF documents with error handling
  async loadPDFDocuments(): Promise<Document[]> {
    try {
      const pdfPath = path.join(__dirname, this.config.documentsPath, this.config.pdfFileName);
      
      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      console.log(`📄 Loading PDF: ${this.config.pdfFileName}`);
      const pdfLoader = new PDFLoader(pdfPath);
      const pdfDocuments = await pdfLoader.load();
      
      console.log(`✅ Successfully loaded ${pdfDocuments.length} pages`);
      return pdfDocuments;
    } catch (error) {
      console.error('❌ Error loading PDF:', error);
      throw error;
    }
  }

  // Process documents with customizable splitting
  async processDocuments(): Promise<void> {
    try {
      // Load PDF documents
      this.documents = await this.loadPDFDocuments();
      
      // Split documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.config.chunkSize,
        chunkOverlap: this.config.chunkOverlap,
      });

      const allSplits = await textSplitter.splitDocuments(this.documents);
      console.log(`📝 Created ${allSplits.length} document chunks`);

      // Create embeddings and vector store
      const embeddings = new MistralAIEmbeddings({
        model: this.config.embeddingModel
      });

      this.vectorStore = new MemoryVectorStore(embeddings);
      await this.vectorStore.addDocuments(allSplits);
      console.log('🚀 Vector store created and populated');

    } catch (error) {
      console.error('❌ Error processing documents:', error);
      throw error;
    }
  }

  // Search with similarity scores
  async searchWithScore(query: string, k: number = 3): Promise<Array<[Document, number]>> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call processDocuments() first.');
    }

    return await this.vectorStore.similaritySearchWithScore(query, k);
  }

  // Simple search without scores
  async search(query: string, k: number = 3): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call processDocuments() first.');
    }

    return await this.vectorStore.similaritySearch(query, k);
  }

  // Batch search with multiple queries
  async batchSearch(queries: string[], k: number = 2): Promise<Record<string, Document[]>> {
    const results: Record<string, Document[]> = {};
    
    for (const query of queries) {
      results[query] = await this.search(query, k);
    }
    
    return results;
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

  // Get document statistics
  getStats(): { totalPages: number; totalChunks: number; config: PDFProcessorConfig } {
    return {
      totalPages: this.documents.length,
      totalChunks: this.vectorStore ? Object.keys(this.vectorStore).length : 0,
      config: this.config
    };
  }

  // Change PDF file and reprocess
  async changePDF(fileName: string,newConfig:PDFProcessorConfig|null): Promise<void> {
    this.config.pdfFileName = fileName;
    this.vectorStore = null;
    this.documents = [];
    await this.processDocuments();
  }
}

// Usage examples
async function runExamples() {
  try {
    // Initialize processor with custom config
    const processor = new CustomPDFProcessor({
      pdfFileName: 'EdwardProffesionalExperience.pdf',
      chunkSize: 800,
      chunkOverlap: 150
    });

    // Process the PDF
    await processor.processDocuments();

    console.log('\n🔍 === SEARCH EXAMPLES ===\n');

    // Example 1: Basic searches
    console.log('1️⃣ Basic Searches:');
    const basicQueries = [
      "When did I join Hubtel",
      "What are my soft skills",
      "Which school did I attend"
    ];

    const basicResults = await processor.batchSearch(basicQueries);
    for (const [query, results] of Object.entries(basicResults)) {
      console.log(`\n📋 Query: "${query}"`);
      console.log(`📄 Top Result: ${results[0]?.pageContent.substring(0, 200)}...`);
    }

    // Example 2: Template-based searches
    console.log('\n2️⃣ Template-based Searches:');
    
    const experienceResult = await processor.searchByTemplate('experience', 'jobHistory', { company: 'Hubtel' });
    console.log(`\n📋 Job History Template:`);
    console.log(`📄 Result: ${experienceResult[0]?.pageContent.substring(0, 200)}...`);

    const skillsResult = await processor.searchByTemplate('skills', 'technical');
    console.log(`\n📋 Technical Skills Template:`);
    console.log(`📄 Result: ${skillsResult[0]?.pageContent.substring(0, 200)}...`);

    // Example 3: Search with scores
    console.log('\n3️⃣ Search with Similarity Scores:');
    const scoredResults = await processor.searchWithScore("programming experience", 2);
    scoredResults.forEach(([doc, score], index) => {
      console.log(`\n📊 Result ${index + 1} (Score: ${score.toFixed(4)}):`);
      console.log(`📄 Content: ${doc.pageContent.substring(0, 150)}...`);
    });

    // Example 4: Display statistics
    console.log('\n📊 === DOCUMENT STATISTICS ===');
    const stats = processor.getStats();
    console.log(`📄 Total Pages: ${stats.totalPages}`);
    console.log(`📝 Chunk Size: ${stats.config.chunkSize}`);
    console.log(`🔄 Chunk Overlap: ${stats.config.chunkOverlap}`);
    console.log(`🤖 Embedding Model: ${stats.config.embeddingModel}`);

    // Example 5: Switching to a different PDF (commented out as file may not exist)
    /*
    console.log('\n🔄 === SWITCHING PDF FILE ===');
    await processor.changePDF('AnotherResume.pdf');
    const newResults = await processor.search("experience");
    console.log('Results from new PDF:', newResults[0]?.pageContent.substring(0, 100));
    */

  } catch (error) {
    console.error('❌ Error in examples:', error);
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
  CustomPDFProcessor, 
  QueryBuilder, 
  PDFProcessorConfig,
  defaultConfig,
  queryTemplates, 
  runExamples 
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}