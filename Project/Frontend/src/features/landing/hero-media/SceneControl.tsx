import { Pause, Play } from "lucide-react"
import { landingContent } from "../content"
import { useSceneRotationContext } from "./sceneRotationContext"

/**
 * The scene control (FEATURE-001 §11.10): the active scene's caption and the
 * pause / play button, in one pill. Only the button is interactive.
 *
 * The caption is plain text, not a live region: scene changes are never
 * announced. The button's accessible name carries its state.
 */
export function SceneControl() {
  const { scenes, currentIndex, playing, togglePlaying } =
    useSceneRotationContext()

  // Before any scene has rendered, the first scene's caption holds the place.
  const activeIndex = currentIndex ?? 0
  const Icon = playing ? Pause : Play

  return (
    <div className="landing-scene-control">
      {/* Every caption shares one cell, so the pill keeps the width of the
          longest and does not resize between scenes. */}
      <p className="landing-captions">
        {scenes.map((scene, index) => {
          const active = index === activeIndex

          return (
            <span
              key={scene.id}
              className="landing-caption"
              data-active={active ? "" : undefined}
              aria-hidden={active ? undefined : true}
            >
              {scene.caption}
            </span>
          )
        })}
      </p>

      <button
        type="button"
        className="landing-control landing-icon-button"
        aria-label={
          playing
            ? landingContent.sceneControl.pause
            : landingContent.sceneControl.play
        }
        onClick={togglePlaying}
      >
        <Icon aria-hidden="true" strokeWidth={2} />
      </button>
    </div>
  )
}
