import { OutputFormatter } from "./utils/OutputFormatter";
import { RAGConfig } from "./types";
import { RAGPipeline } from "./core/RAGPipeline";

async function main() {
  // Disable LangSmith tracing to avoid 403 errors
  process.env.LANGCHAIN_TRACING_V2 = "false";

  // Configuration
  const config: RAGConfig = {
    llm: {
      model: "mistral-large-latest",
      temperature: 0
    },
    embeddings: {
      model: "mistral-embed"
    },
    chunking: {
      chunkSize: 1000,
      chunkOverlap: 200
    },
    vectorStore: {
      type: 'memory'
      // For Pinecone, use:
      // type: 'pinecone',
      // pineconeConfig: {
      //   indexName: process.env.PINECONE_INDEX ?? "default",
      //   maxConcurrency: 5
      // }
    },
    documentLoader: {
      type: 'web',
      webConfig: {
        url: "https://lilianweng.github.io/posts/2023-06-23-agent/",
        selector: "p"
      }
    }
  };

  try {
    // Initialize RAG pipeline
    console.log("🚀 Initializing RAG Pipeline...");
    const ragPipeline = new RAGPipeline(config);
    await ragPipeline.initialize();
    
    // Query the pipeline
    console.log("💬 Querying: What is task decomposition?");
    const response = await ragPipeline.query("What is task decomposition?");
    
    // Format and display response
    console.log(OutputFormatter.formatResponse(response));
    
    // You can also add more documents dynamically
    // await ragPipeline.addNewDocuments({
    //   type: 'text',
    //   textConfig: {
    //     content: "Additional content to index..."
    //   }
    // });
    
    // Example with different formatting
    console.log("\n" + "=".repeat(50));
    console.log("📝 CLEAN ANSWER FORMAT:");
    console.log(OutputFormatter.formatAnswerOnly(response));
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Export for use in other modules
export { RAGPipeline, OutputFormatter };
export * from "./types";

// Run if this is the main module
if (require.main === module) {
  main();
}