import type { AiChatRequest, AiChatResponse } from "../types/ai";

export type AiServiceStatus = "ready" | "not-configured";

export interface AiServiceClient {
  readonly status: AiServiceStatus;
  sendMessage(request: AiChatRequest): Promise<AiChatResponse>;
}

export class AiServiceNotConfiguredError extends Error {
  constructor() {
    super("The AI assistant backend is not connected yet.");
    this.name = "AiServiceNotConfiguredError";
  }
}

// Replace this implementation once the AI Service publishes a confirmed API contract.
// Keeping the interface here lets the Home UI remain unchanged when that integration lands.
export const aiService: AiServiceClient = {
  status: "not-configured",
  async sendMessage(request) {
    void request;
    throw new AiServiceNotConfiguredError();
  },
};
