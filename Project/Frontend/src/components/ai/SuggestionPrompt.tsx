import { ArrowUpRight } from "lucide-react";

export function SuggestionPrompt({ children, onSelect }: { children: string; onSelect: (prompt: string) => void }) {
  return <button className="suggestion-prompt" onClick={() => onSelect(children)}><span>{children}</span><ArrowUpRight size={14} /></button>;
}
