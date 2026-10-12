import { createContext, useContext } from "react"
import type { SceneRotation } from "./useSceneRotation"

/**
 * One rotation, shared by the media layer and the scene control, which sit at
 * opposite ends of the page.
 */
export const SceneRotationContext = createContext<SceneRotation | null>(null)

export function useSceneRotationContext(): SceneRotation {
  const rotation = useContext(SceneRotationContext)
  if (rotation === null) {
    throw new Error(
      "useSceneRotationContext must be used inside <SceneRotationProvider>.",
    )
  }
  return rotation
}
