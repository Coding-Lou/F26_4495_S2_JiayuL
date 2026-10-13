import type { RouteObject } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import {
  AUTH_CALLBACK_PATH,
  AuthCallbackRoute,
  ProtectedRoute,
  PublicLandingRoute,
} from "@/features/auth"
import { GearPage } from "@/pages/GearPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { PublicLandingPage } from "@/pages/PublicLandingPage"
import { TrailDetailPage } from "@/pages/TrailDetailPage"
import { TripPreparationPage } from "@/pages/TripPreparationPage"

export const appRoutes: RouteObject[] = [
  // The Public Landing has its own navigation and sits outside AppLayout.
  // A signed-in user who opens it is taken on to /home.
  {
    path: "/",
    element: (
      <PublicLandingRoute>
        <PublicLandingPage />
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
      { path: "home", element: <HomePage /> },
      // Trail Detail and Trip Preparation each have a full-viewport shell of
      // their own as well (FEATURE-004 section 21.1). The Preparation
      // address holds the selection, the trail and the trip date; a missing
      // date is a state of that screen, so the segment is optional.
      { path: "trails/:trailId", element: <TrailDetailPage /> },
      {
        path: "trails/:trailId/prepare/:tripDate?",
        element: <TripPreparationPage />,
      },
      {
        element: <AppLayout />,
        children: [{ path: "gear", element: <GearPage /> }],
      },
    ],
  },
  // Not found stays reachable by anyone.
  {
    element: <AppLayout />,
    children: [{ path: "*", element: <NotFoundPage /> }],
  },
]
