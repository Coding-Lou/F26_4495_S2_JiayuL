import { Mountain, UserRound } from "lucide-react";
import type { AiChatMessage } from "../../types/ai";

export function ChatMessage({ message }: { message: AiChatMessage }) {
  const assistant = message.role === "assistant";
  return <article className={`chat-message chat-message--${message.role}`}>
    <span className="chat-message__avatar">{assistant ? <Mountain size={17} /> : <UserRound size={17} />}</span>
    <div><div className="chat-message__meta"><strong>{assistant ? "Outdoor Assistant" : "You"}</strong>{message.prototype && <span>Prototype response</span>}</div><p>{message.content}</p></div>
  </article>;
}
