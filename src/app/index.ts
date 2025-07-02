import {CustomPDFProcessor,PDFProcessorConfig,defaultConfig} from './utils.js';

async function main() {
  // Create an instance of the PDF processor with default configuration
  const pdfProcessor = new CustomPDFProcessor(defaultConfig);

  try {
    // Load and process PDF documents
     //runExamples();

    const newPdfConfig: PDFProcessorConfig = {
      pdfFileName: "EdwardProffesionalExperience.pdf",
      chunkSize: 500,
      chunkOverlap: 100,
      embeddingModel: "mistral-embed",
      documentsPath: "../../src/assets/documents"
    };

    // Create a new instance with custom configuration
    const customPdfProcessor = new CustomPDFProcessor(newPdfConfig);
     // Process the PDF
    await customPdfProcessor.processDocuments();

    console.log('\n🔍 === SEARCH EXAMPLES ===\n');

    // Example 1: Basic searches
    console.log('1️⃣ Basic Searches:');
    const basicQueries = [
      "When did I become a team lead at Hubtel",
      "What are my soft skills",
       "What are my skills",
      "Which is my education background",
    ];

    const { results: basicResults, metadata } = await customPdfProcessor.batchSearchAdvanced(basicQueries);

    for (const [query, documents] of Object.entries(basicResults)) {
    console.log(`\n📋 Query: "${query}"`);
        if (documents.length > 0) {
            console.log(`📄 Top Result: ${documents[0].pageContent.substring(0, 200)}...`);
            console.log(`📊 Found ${documents.length} total results`);
        } else {
            console.log(`❌ No results found`);
        }
    }

    await customPdfProcessor.changePDF('How-To-Buy-Sell-Shares-GSE.pdf',null);

    const queries:string[]=[
        "How can i buy shares on the GSE?",
        "WHAT IS A STOCK EXCHANGE?",
        "WHY DO WE NEED A STOCK EXCHANGE?"
    ];

   await customPdfProcessor.processEmbeddedQueriesWithDetailedLogging(queries);


  } catch (error) {
    console.error("❌ Error processing PDF documents:", error);
  }
}

// Run the main function
main().catch(error => {
  console.error("❌ Unhandled error in main:", error);
});