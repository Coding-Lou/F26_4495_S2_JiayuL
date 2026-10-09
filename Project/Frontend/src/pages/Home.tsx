import { Compass, Leaf, Sparkles } from "lucide-react";
import { useState } from "react";
import { ChatComposer } from "../components/ai/ChatComposer";
import { ChatMessage } from "../components/ai/ChatMessage";
import { SuggestionPrompt } from "../components/ai/SuggestionPrompt";
import { aiService } from "../services/aiService";
import type { AiChatMessage } from "../types/ai";

const suggestions = [
  "Plan a weekend hike",
  "Find an easy trail near Vancouver",
  "What should I pack for a rainy hike?",
  "Find trails within 30 km",
  "Recommend a trail with good views",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Home({ name, authenticated }: { name: string; authenticated: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const content = input.trim();
    if (!content || sending) return;
    const userMessage: AiChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    if (aiService.status === "not-configured") {
      setMessages([...nextMessages, {
        id: crypto.randomUUID(),
        role: "assistant",
        prototype: true,
        content: "Your question is ready, but it was not sent to an AI service. Personalized trail, weather, and gear guidance will appear here once the AI backend is connected.",
      }]);
      return;
    }

    setSending(true);
    try {
      const response = await aiService.sendMessage({ message: content, history: messages.map(({ role, content: text }) => ({ role, content: text })) });
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", content: response.message }]);
    } catch {
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", content: "The assistant could not respond right now. Please try again later." }]);
    } finally {
      setSending(false);
    }
  };

  return <div className={`home-page ${messages.length ? "home-page--conversation" : ""}`}>
    <header className="home-topbar"><span><Leaf size={15} />Outdoor AI</span><span className="prototype-pill"><Sparkles size={12} />Assistant prototype</span></header>
    <main className="home-assistant">
      {messages.length === 0 ? <section className="home-welcome">
        <div className="home-welcome__mark"><Compass size={27} /></div>
        <p>{getGreeting()}, {authenticated ? name.split(" ")[0] : "Explorer"}</p>
        <h1>Where do you want to explore?</h1>
        <span>Ask for inspiration now. Personalized AI guidance is coming next.</span>
      </section> : <section className="chat-thread" aria-live="polite">{messages.map((message) => <ChatMessage key={message.id} message={message} />)}</section>}
      <section className="home-input-area">
        <ChatComposer value={input} onChange={setInput} onSubmit={() => void submit()} disabled={sending} />
        {messages.length === 0 && <div className="suggestion-list">{suggestions.map((suggestion) => <SuggestionPrompt key={suggestion} onSelect={setInput}>{suggestion}</SuggestionPrompt>)}</div>}
        <small className="assistant-disclaimer">Prototype interface · AI service is not connected and no message is sent externally.</small>
      </section>
    </main>
  </div>;
}
