import { ArrowUp, Sparkles } from "lucide-react";
import { useRef, type FormEvent, type KeyboardEvent } from "react";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChatComposer({ value, onChange, onSubmit, disabled = false }: ChatComposerProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (value.trim() && !disabled) onSubmit();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return <form className="chat-composer" onSubmit={submit}>
    <Sparkles className="chat-composer__spark" size={19} />
    <textarea ref={textarea} rows={1} value={value} disabled={disabled} aria-label="Ask the hiking assistant" placeholder="Ask about trails, weather, gear, or your next trip..." onKeyDown={handleKeyDown} onChange={(event) => onChange(event.target.value)} />
    <button type="submit" aria-label="Send message" disabled={disabled || !value.trim()}><ArrowUp size={19} /></button>
  </form>;
}
