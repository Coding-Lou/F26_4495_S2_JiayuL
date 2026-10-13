import { AuthenticatedHome } from "@/features/home/AuthenticatedHome"

/**
 * Route `/home`: the Authenticated Home, the conversational trip planner over
 * the Home media (FEATURE-003). Protected, and rendered outside the
 * application layout.
 */
export function HomePage() {
  return <AuthenticatedHome />
}
