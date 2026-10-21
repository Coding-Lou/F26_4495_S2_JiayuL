import { useEffect, useImperativeHandle, useRef } from "react"
import type { RuntimeProps } from "../runtimeTypes"
import { RuntimeController } from "./RuntimeController"

/**
 * The 3D runtime's React entry, the one module the shell imports
 * dynamically. Everything that imports `three` or `@react-three/fiber` is
 * reachable only from here, so the 3D chunk is requested only when the
 * viewer mounts (FEATURE-005 section 28.2).
 *
 * It renders nothing of its own into the DOM: its controller puts one canvas
 * into the shell's root element.
 */
export default function AvatarRuntime({
  host,
  equipped,
  reducedMotion,
  paused,
  readyCue,
  onState,
  onRendererCreated,
  handleRef,
}: RuntimeProps) {
  const controllerRef = useRef<RuntimeController | null>(null)
  const latest = useRef({ equipped, reducedMotion, paused, readyCue })
  const callbacks = useRef({ onState, onRendererCreated })

  useEffect(() => {
    latest.current = { equipped, reducedMotion, paused, readyCue }
    callbacks.current = { onState, onRendererCreated }
  })

  // One controller per mount. Creation waits one task, so a mount that is
  // undone at once (React StrictMode in development) never requests a model
  // or creates a renderer.
  useEffect(() => {
    let controller: RuntimeController | null = null
    const timer = window.setTimeout(() => {
      controller = new RuntimeController(host, latest.current, {
        onState: (state) => callbacks.current.onState(state),
        onRendererCreated: () => callbacks.current.onRendererCreated(),
      })
      controllerRef.current = controller
      void controller.start()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      controller?.dispose()
      controllerRef.current = null
    }
  }, [host])

  // Business state in, by content: an equal set is no change (28.3). The
  // ready cue is a number; the controller acts only on an increase.
  const equippedKey = [...equipped].sort().join(",")
  useEffect(() => {
    controllerRef.current?.setInputs(latest.current)
  }, [equippedKey, reducedMotion, paused, readyCue])

  useImperativeHandle(
    handleRef,
    () => ({
      turnLeft: () => controllerRef.current?.turn(1),
      turnRight: () => controllerRef.current?.turn(-1),
      resetView: () => controllerRef.current?.resetView(),
      retryFailedGear: () => controllerRef.current?.retryFailedGear(),
    }),
    [],
  )

  return null
}
