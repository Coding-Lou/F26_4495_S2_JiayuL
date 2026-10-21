/**
 * The real-time avatar (FEATURE-005 sections 25, 28): the public entry of
 * `features/avatar`. A leaf: it imports nothing from a business feature,
 * makes no API request, reads no storage, and reads no route.
 *
 * Everything exported here is three-free. Only the viewer shell, through one
 * dynamic `import()` of `./runtime/AvatarRuntime`, reaches code that imports
 * `three` or `@react-three/fiber`.
 */
export {
  avatarManifest,
  type GearCategoryKey,
  type VisualCategory,
} from "./avatarManifest"
export { AvatarViewer } from "./AvatarViewer"
export type {
  AvatarViewerHandle,
  AvatarViewerProps,
  AvatarViewerState,
  AvatarViewerStatus,
  CategoryDisplay,
  ReadyClipStatus,
  UnavailableReason,
} from "./viewerTypes"
