import type { RouteObject } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import {
  AUTH_CALLBACK_PATH,
  AuthCallbackRoute,
  ProtectedRoute,
  PublicLandingRoute,
} from "@/features/auth"
import { GearStudioRoute } from "@/pages/GearStudioRoute"
import {
  DiscoverRoute,
  GearRoute,
  HomeRoute,
  MemoriesRoute,
  MemoryCreateRoute,
  MemoryDetailRoute,
  MemoryEditRoute,
  PlansRoute,
  TrailDetailRoute,
  TripPreparationRoute,
} from "@/pages/LazyRoutes"
import { NotFoundPage } from "@/pages/NotFoundPage"

export const appRoutes: RouteObject[] = [
  // The public homepage (FEATURE-006): the Hero, then Discover. It has its
  // own header and sits outside AppLayout. A signed-in user who opens it is
  // taken on to /home. Its selected trail is the `trail` search parameter.
  {
    path: "/",
    element: (
      <PublicLandingRoute>
        <DiscoverRoute />
      </PublicLandingRoute>
    ),
  },
  // Where the identity provider returns to after sign-in or registration.
  { path: AUTH_CALLBACK_PATH, element: <AuthCallbackRoute /> },
  // Protected routes. The guard is outside the layout, so a waiting state
  // replaces the layout as well and no identity is shown before a session.
  {
    element: <ProtectedRoute />,
    children: [
      // The Authenticated Home has its own full-viewport shell over the Home
      // media and sits outside AppLayout, as the Public Landing does
      // (FEATURE-003 D1). It is still behind the guard.
      { path: "home", element: <HomeRoute /> },
      // Trail Detail and Trip Preparation each have a full-viewport shell of
      // their own as well (FEATURE-004 section 21.1). The Preparation
      // address holds the selection, the trail and the trip date; a missing
      // date is a state of that screen, so the segment is optional.
      { path: "trails/:trailId", element: <TrailDetailRoute /> },
      {
        path: "trails/:trailId/prepare/:tripDate?",
        element: <TripPreparationRoute />,
      },
      // The Gear Customization Studio (FEATURE-005 section 10), in the same
      // shell. Its date segment is required: without one the address is
      // Trip Preparation's, which asks for a date.
      {
        path: "trails/:trailId/prepare/:tripDate/pack",
        element: <GearStudioRoute />,
      },
      // My Gear (FEATURE-007 D1, D2), in the same trip shell, so the header
      // that led here is the header it shows.
      { path: "gear", element: <GearRoute /> },
      // My Plans (FEATURE-013 D1), in the same trip shell. One route: the
      // selected Plan is the `plan` search parameter, never a path segment.
      { path: "plans", element: <PlansRoute /> },
      // My Memories (FEATURE-009 D1–D3), in the same trip shell. The static
      // `new` segment ranks above `:memoryId`.
      { path: "memories", element: <MemoriesRoute /> },
      { path: "memories/new", element: <MemoryCreateRoute /> },
      { path: "memories/:memoryId", element: <MemoryDetailRoute /> },
      { path: "memories/:memoryId/edit", element: <MemoryEditRoute /> },
    ],
  },
  // Not found stays reachable by anyone.
  {
    element: <AppLayout />,
    children: [{ path: "*", element: <NotFoundPage /> }],
  },
]
