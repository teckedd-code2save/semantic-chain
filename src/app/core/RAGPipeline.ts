import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { VectorStore } from "@langchain/core/vectorstores";
import { DocumentLoaderFactory } from "../loaders/DocumentLoaderFactory";
import { VectorStoreFactory } from "../vectorstores/VectorStoreFactory";
import { DocumentLoaderConfig, RAGConfig, RAGResponse } from "../types";

export class RAGPipeline {
  private llm: ChatMistralAI;
  private embeddings: MistralAIEmbeddings;
  private vectorStore: VectorStore = null as any; // Initialized later
  private promptTemplate: ChatPromptTemplate = null as any; // Initialized later
  private graph: any;
  private config: RAGConfig;

  constructor(config: RAGConfig) {
    this.config = config;
    this.llm = new ChatMistralAI({
      model: config.llm.model,
      temperature: config.llm.temperature
    });
    this.embeddings = new MistralAIEmbeddings({
      model: config.embeddings.model,
    });
  }

  async initialize(): Promise<void> {
    // Initialize vector store
    this.vectorStore = await VectorStoreFactory.createVectorStore(
      this.config.vectorStore,
      this.embeddings
    );

    // Load and process documents
    await this.loadAndIndexDocuments();

    // Load prompt template
    this.promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");

    // Build the graph
    this.buildGraph();
  }

  private async loadAndIndexDocuments(): Promise<void> {
    // Load documents
    const docs = await DocumentLoaderFactory.loadDocuments(this.config.documentLoader);
    
    // Split documents
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunking.chunkSize,
      chunkOverlap: this.config.chunking.chunkOverlap
    });
    
    const allSplits = await splitter.splitDocuments(docs);
    
    // Index chunks
    await this.addSplitDocuments(allSplits);
    
    console.log(`✅ Indexed ${allSplits.length} document chunks`);
  }

  private buildGraph(): void {
    // Define state annotations
    const InputStateAnnotation = Annotation.Root({
      question: Annotation<string>,
    });

    const StateAnnotation = Annotation.Root({
      question: Annotation<string>,
      context: Annotation<Document[]>,
      answer: Annotation<string>,
    });

    // Define application steps
    const retrieve = async (state: typeof InputStateAnnotation.State) => {
      const retrievedDocs = await this.vectorStore.similaritySearch(state.question, 4);
      return { context: retrievedDocs };
    };

    const generate = async (state: typeof StateAnnotation.State) => {
      const docsContent = state.context.map(doc => doc.pageContent).join("\n\n");
      const messages = await this.promptTemplate.invoke({ 
        question: state.question, 
        context: docsContent 
      });
      const response = await this.llm.invoke(messages);
      return { answer: response.content };
    };

    // Compile the graph
    this.graph = new StateGraph(StateAnnotation)
      .addNode("retrieve", retrieve)
      .addNode("generate", generate)
      .addEdge("__start__", "retrieve")
      .addEdge("retrieve", "generate")
      .addEdge("generate", "__end__")
      .compile();
  }

  async query(question: string): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      const result = await this.graph.invoke({ question });
      const processingTime = Date.now() - startTime;
      
      return {
        answer: result.answer,
        context: result.context.map((doc: Document) => doc.pageContent),
        metadata: {
          retrievedDocs: result.context.length,
          processingTime
        }
      };
    } catch (error) {
      throw new Error(`RAG query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addSplitDocuments(docs: Document<Record<string, any>>[]): Promise<void> {
    
    await this.vectorStore.addDocuments(docs);
    
    console.log(`✅ Added ${docs.length} new document chunks`);
  }

async addNewDocuments(config:DocumentLoaderConfig): Promise<void> {
    const docs = await DocumentLoaderFactory.loadDocuments(config);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunking.chunkSize,
      chunkOverlap: this.config.chunking.chunkOverlap
    });
    
    const allSplits = await splitter.splitDocuments(docs);
    await this.vectorStore.addDocuments(allSplits);
    
    console.log(`✅ Added ${allSplits.length} new document chunks`);
  }
}

