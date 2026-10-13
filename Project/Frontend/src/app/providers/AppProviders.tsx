import type { PropsWithChildren } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { registerSessionCleanup } from "@/features/auth"
import { PlannerSessionBoundary } from "@/features/planning/PlannerSessionBoundary"
import { queryClient } from "./queryClient"

// Server data belongs to the session it was fetched in: when a session ends
// in this tab (sign-out, expiry), the cache is emptied.
registerSessionCleanup(() => queryClient.clear())

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* The planner's conversation ends with the session too, on any route
          (FEATURE-003 section 16). */}
      <PlannerSessionBoundary />
      {children}
    </QueryClientProvider>
  )
}
