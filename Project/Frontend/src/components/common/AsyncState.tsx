import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading your adventure…" }: { label?: string }) {
  return <div className="state-card"><span className="spinner" /><p>{label}</p></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="state-card state-card--error"><AlertTriangle size={24} /><div><strong>We hit a trailblock</strong><p>{message}</p></div>{onRetry && <button className="button button--secondary" onClick={onRetry}><RefreshCw size={16} />Try again</button>}</div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-state__icon"><Inbox size={28} /></span><h3>{title}</h3><p>{message}</p>{action}</div>;
}
