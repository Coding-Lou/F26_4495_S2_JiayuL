import type { PropsWithChildren } from "react"
import { SceneRotationContext } from "./sceneRotationContext"
import { heroScenes } from "./scenes"
import { useSceneRotation } from "./useSceneRotation"

/**
 * Runs the hero's scene rotation over the scene-definition list and shares it
 * with `HeroMedia` and `SceneControl`. The page around them never sees a scene.
 */
export function SceneRotationProvider({ children }: PropsWithChildren) {
  const rotation = useSceneRotation(heroScenes)

  return <SceneRotationContext value={rotation}>{children}</SceneRotationContext>
}
