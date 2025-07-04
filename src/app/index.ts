import {CustomPDFProcessor,PDFProcessorConfig,defaultConfig} from './utils.js';

async function main() {
  // Create an instance of the PDF processor with default configuration
  const customPdfProcessor = new CustomPDFProcessor(defaultConfig);

  try {
    
    
     // Process the PDF
    await customPdfProcessor.processDocuments();

    console.log('\n🔍 === INSIGHTS ON MY RESUME ===\n');

    // Example 1: Basic searches
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

    console.log('\n🔍 === GHANA STOCK EXCHANGE ===\n');

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