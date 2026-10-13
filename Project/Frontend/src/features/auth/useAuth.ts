import { useSyncExternalStore } from "react"
import {
  getAuthSnapshot,
  subscribeToAuth,
  type AuthSnapshot,
} from "./authSession"

/** The current auth state. Only `authenticated` may show protected content. */
export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getAuthSnapshot)
}
