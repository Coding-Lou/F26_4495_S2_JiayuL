export type AiMessageRole = "user" | "assistant";

export interface AiChatMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  prototype?: boolean;
}

export interface AiChatRequest {
  message: string;
  history: Array<Pick<AiChatMessage, "role" | "content">>;
}

export interface AiChatResponse {
  message: string;
}
