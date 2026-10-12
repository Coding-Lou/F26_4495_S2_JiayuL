import type { RouteObject } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { GearPage } from "@/pages/GearPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { PublicLandingPage } from "@/pages/PublicLandingPage"
import { TrailDetailPage } from "@/pages/TrailDetailPage"

export const appRoutes: RouteObject[] = [
  // The Public Landing has its own navigation and sits outside AppLayout.
  { path: "/", element: <PublicLandingPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "home", element: <HomePage /> },
      { path: "trails/:trailId", element: <TrailDetailPage /> },
      { path: "gear", element: <GearPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
