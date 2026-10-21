import { lazy, Suspense } from "react"

/**
 * The Gear Customization Studio is its own chunk (FEATURE-005 section 33):
 * nothing it adds is loaded on another route. Its 3D runtime is a second,
 * separate chunk that only the Studio requests, from 768px wide.
 */
const GearStudioPage = lazy(() =>
  import("./GearStudioPage").then((module) => ({
    default: module.GearStudioPage,
  })),
)

export function GearStudioRoute() {
  return (
    // While the chunk arrives: the trip shell's `ink` base, and nothing else,
    // so no light page flashes between two dark screens.
    <Suspense fallback={<div className="trip" />}>
      <GearStudioPage />
    </Suspense>
  )
}
