import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { DocumentLoaderConfig } from "../types";
import fs from 'fs';

export class DocumentLoaderFactory {
  static async createLoader(config: DocumentLoaderConfig) {
    switch (config.type) {
      case 'web':
        if (!config.webConfig) throw new Error('Web config required for web loader');
        return new CheerioWebBaseLoader(config.webConfig.url, {
          selector: (config.webConfig.selector || "p") as any
        });
      
      case 'file':
        if (!config.fileConfig) throw new Error('File config required for file loader');
        if (!fs.existsSync(config.fileConfig.path)) {
          throw new Error(`File not found: ${config.fileConfig.path}`);
        }
        switch (config.fileConfig.type) {
          case 'pdf':
            return new PDFLoader(config.fileConfig.path);
          case 'txt':
            return new TextLoader(config.fileConfig.path);
          default:
            throw new Error(`Unsupported file type: ${config.fileConfig.type}`);
        }
      
      case 'text':
        if (!config.textConfig) throw new Error('Text config required for text loader');
        return {
          load: async () => [
            new Document({
              pageContent: config.textConfig!.content,
              metadata: { source: 'text-input' }
            })
          ]
        };
      
      default:
        throw new Error(`Unsupported loader type: ${config.type}`);
    }
  }

  static async loadDocuments(config: DocumentLoaderConfig): Promise<Document[]> {
    const loader = await this.createLoader(config);
    return await loader.load();
  }
}