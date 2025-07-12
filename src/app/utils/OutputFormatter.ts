import { RAGResponse } from "../types";

export class OutputFormatter {
  static formatResponse(response: RAGResponse): string {
    const separator = "═".repeat(80);
    const minorSeparator = "─".repeat(40);
    
    return `
${separator}
🤖 AI ASSISTANT RESPONSE
${separator}

📝 ANSWER:
${response.answer}

${minorSeparator}
📚 RETRIEVED CONTEXT:
${minorSeparator}

${response.context.map((ctx, index) => `
[Context ${index + 1}]:
${ctx.trim()}
`).join('\n' + '─'.repeat(20) + '\n')}

${minorSeparator}
📊 METADATA:
${minorSeparator}
• Retrieved Documents: ${response.metadata.retrievedDocs}
• Processing Time: ${response.metadata.processingTime}ms

${separator}
`;
  }

  static formatAnswerOnly(response: RAGResponse): string {
    return `
🤖 Answer: ${response.answer}
`;
  }

  static formatWithSummary(response: RAGResponse): string {
    const separator = "═".repeat(60);
    
    return `
${separator}
🤖 AI RESPONSE
${separator}

${response.answer}

${separator}
📊 Query Summary: Retrieved ${response.metadata.retrievedDocs} documents in ${response.metadata.processingTime}ms
${separator}
`;
  }
}
