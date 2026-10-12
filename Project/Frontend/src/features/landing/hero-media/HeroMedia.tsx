import { cn } from "@/lib/utils"
import { SceneMedia, type ScenePhase } from "./SceneMedia"
import { useSceneRotationContext } from "./sceneRotationContext"

/**
 * The hero's media layer (FEATURE-001 §11.7, layer 1).
 *
 * Stacks the scenes and runs the cross-fade: the incoming scene fades in on
 * top of the outgoing one, which stays fully opaque until the fade has ended.
 * Two scenes never fade at once, so the base colour never shows through.
 *
 * The layer is decorative: hidden from assistive technology, inert, and closed
 * to pointer events. It never inspects a scene's media kind.
 */
export function HeroMedia() {
  const {
    scenes,
    currentIndex,
    previousIndex,
    fading,
    running,
    motionLoad,
    reportStill,
    reportMotionSettled,
  } = useSceneRotationContext()

  return (
    <div
      aria-hidden="true"
      inert
      // Lowest layer of the page: beneath the scrims (-1) and the foreground.
      className="pointer-events-none absolute inset-0 -z-2 select-none"
    >
      {scenes.map((scene, index) => {
        const phase: ScenePhase =
          index === currentIndex
            ? "current"
            : index === previousIndex
              ? "outgoing"
              : "hidden"

        return (
          <div
            key={scene.id}
            data-scene={scene.id}
            data-phase={phase}
            className={cn(
              "absolute inset-0",
              phase === "current" && "z-20 opacity-100",
              phase === "current" &&
                fading &&
                "transition-opacity duration-(--duration-scene-fade) ease-scene",
              phase === "outgoing" && "z-10 opacity-100",
              phase === "hidden" && "z-0 opacity-0",
            )}
          >
            <SceneMedia
              scene={scene}
              phase={phase}
              running={running}
              stillPriority={index === 0 ? "high" : "low"}
              loadMotion={motionLoad[index]}
              onStillSettled={reportStill}
              onMotionSettled={reportMotionSettled}
            />
          </div>
        )
      })}
    </div>
  )
}
