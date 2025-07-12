import {SemanticSearchProcessor,defaultConfig} from './core/SemanticSearch.js';

import path from 'path';
import { fileURLToPath } from 'url';
import { DocumentLoaderConfig } from './main.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loaderConfig: DocumentLoaderConfig = {
      type: 'web',
      webConfig: {
        url: "https://lilianweng.github.io/posts/2023-06-23-agent/",
        selector: "p"
      }
    }

export async function documentSearch() {

  // Create an instance of the SemanticSearchProcessor 
  const semanticSearchProcessor = new SemanticSearchProcessor(defaultConfig,loaderConfig);

  try {
    
    
    console.log('\n🔍 === GHANA STOCK EXCHANGE ===\n');


    const queries:string[]=[
        "How can i buy shares on the GSE?",
        "WHAT IS A STOCK EXCHANGE?",
        "WHY DO WE NEED A STOCK EXCHANGE?"
    ];

   await semanticSearchProcessor.processEmbeddedQueriesWithDetailedLogging(queries);



  } catch (error) {
    console.error("❌ Error processing PDF documents:", error);
  }
}

