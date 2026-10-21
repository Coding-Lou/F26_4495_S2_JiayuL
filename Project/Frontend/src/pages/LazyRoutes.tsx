import { lazy, Suspense, type ComponentType } from "react"

/**
 * Lazily loaded route pages (FEATURE-006 section 14, D13). Each page is its
 * own chunk, so a signed-out visit to `/` downloads Discover and nothing of
 * the planner, Trip Preparation, the Studio, gear, or the avatar. The Studio
 * keeps its own route module (`GearStudioRoute`).
 *
 * While a chunk arrives: the `ink` base of the shells, and nothing else, so
 * no light page flashes between two dark screens.
 */
function lazyPage<Name extends string>(
  load: () => Promise<Record<Name, ComponentType>>,
  name: Name,
) {
  return lazy(() => load().then((module) => ({ default: module[name] })))
}

const DiscoverPage = lazyPage(() => import("./DiscoverPage"), "DiscoverPage")
const GearPage = lazyPage(() => import("./GearPage"), "GearPage")
const HomePage = lazyPage(() => import("./HomePage"), "HomePage")
const TrailDetailPage = lazyPage(
  () => import("./TrailDetailPage"),
  "TrailDetailPage",
)
const TripPreparationPage = lazyPage(
  () => import("./TripPreparationPage"),
  "TripPreparationPage",
)
// My Plans (FEATURE-013 D1): one chunk.
const PlansPage = lazyPage(() => import("./PlansPage"), "PlansPage")
// My Memories (FEATURE-009 D3): three chunks. Create and Edit share the
// editor's chunk.
const MemoriesPage = lazyPage(() => import("./MemoriesPage"), "MemoriesPage")
const MemoryDetailPage = lazyPage(
  () => import("./MemoryDetailPage"),
  "MemoryDetailPage",
)
const MemoryCreatePage = lazyPage(
  () => import("./MemoryEditorPage"),
  "MemoryCreatePage",
)
const MemoryEditPage = lazyPage(
  () => import("./MemoryEditorPage"),
  "MemoryEditPage",
)

function ShellFallback() {
  return <div className="trip" />
}

export function DiscoverRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <DiscoverPage />
    </Suspense>
  )
}

export function HomeRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <HomePage />
    </Suspense>
  )
}

export function TrailDetailRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <TrailDetailPage />
    </Suspense>
  )
}

export function TripPreparationRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <TripPreparationPage />
    </Suspense>
  )
}

export function GearRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <GearPage />
    </Suspense>
  )
}

export function PlansRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <PlansPage />
    </Suspense>
  )
}

export function MemoriesRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <MemoriesPage />
    </Suspense>
  )
}

export function MemoryDetailRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <MemoryDetailPage />
    </Suspense>
  )
}

export function MemoryCreateRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <MemoryCreatePage />
    </Suspense>
  )
}

export function MemoryEditRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <MemoryEditPage />
    </Suspense>
  )
}
