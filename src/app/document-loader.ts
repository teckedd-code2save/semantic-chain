// Document loaders
import {Document} from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
// Text splitter
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// Pathe and URL utilities
import path from 'path';
import { fileURLToPath } from 'url';

// Mistral AI embeddings
import { MistralAIEmbeddings } from "@langchain/mistralai";

// In Memory vector store
import { MemoryVectorStore } from "langchain/vectorstores/memory";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const documents: Document[] = [
     new Document({
    pageContent:
      "Dogs are great companions, known for their loyalty and friendliness.",
    metadata: { source: "mammal-pets-doc" },
  }),
  new Document({
    pageContent: "Cats are independent pets that often enjoy their own space.",
    metadata: { source: "mammal-pets-doc" },
  }),

]

export async function loadPDfDocuments(): Promise<Document[]> {
  // Load documents from a PDF file
  const pdfLoader = new PDFLoader(path.join(__dirname, '../../src/assets/documents/EdwardProffesionalExperience.pdf'));
  const pdfDocuments = await pdfLoader.load();

  // Combine the loaded documents with the predefined ones
  return pdfDocuments;
}

// Load the PDF documents and log their content and metadata

const pdfDocuments = await loadPDfDocuments();
console.log("********** View first document content **********");
console.log(pdfDocuments[0].pageContent); // Output the content of the first document
// console.log("********** View first document metadata **********");
// console.log(pdfDocuments[0].metadata); // Output the metadata of the first document


// Split the loaded PDF documents into smaller chunks

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const allSplits = await textSplitter.splitDocuments(pdfDocuments);

// console.log("********** Number of splits created **********");
// console.log(allSplits.length); // Output the number of splits created
// console.log("********** View first split content **********");
// console.log(allSplits[0].pageContent); // Output the content of the first split
// console.log("********** View first split metadata **********");
// console.log(allSplits[0].metadata); // Output the metadata of the first split


// Create embeddings for the split documents using Mistral AI
const embeddings = new MistralAIEmbeddings({
  model: "mistral-embed"
});

const vector1 = await embeddings.embedQuery(allSplits[0].pageContent);
const vector2 = await embeddings.embedQuery(allSplits[1].pageContent);

// console.assert(vector1.length === vector2.length);
// console.log(`Generated vectors of length ${vector1.length}\n`);
// console.log(vector1.slice(0, 10));


const vectorStore = new MemoryVectorStore(embeddings);
await vectorStore.addDocuments(allSplits);

const results1 = await vectorStore.similaritySearch(
  "When did i join hubtel"
);

const results2 = await vectorStore.similaritySearchWithScore(
  "name my soft skills"
);

const results3 = await vectorStore.similaritySearchWithScore(
  "Which school did i attend"
);

console.log("********** View first result content **********");
console.log(results1[0]);

console.log("********** View second result content **********");
console.log(results2[0]);

console.log("********** View third result content **********");
console.log(results3[0]);