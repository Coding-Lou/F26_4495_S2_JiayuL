import {
  Component,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type Ref,
} from "react"
import type { RuntimeHandle, RuntimeProps, RuntimeState } from "./runtimeTypes"
import { composeStatus } from "./viewerStatus"
import type {
  AvatarViewerHandle,
  AvatarViewerProps,
  UnavailableReason,
} from "./viewerTypes"

/** Section 34.1 step 3: the 3D chunk within 20 s. */
const CHUNK_LIMIT_MS = 20_000

type Failure = { reason: UnavailableReason; retryable: boolean }

/**
 * The viewer's three-free shell (FEATURE-005 sections 28.2, 28.3, 34).
 *
 * It does the WebGL 2 check, makes the one dynamic `import()` of the 3D
 * runtime, holds the error boundary, and reports the status outward. Nothing
 * in this file imports `three` or `@react-three/fiber`: until the runtime is
 * imported, the viewer costs no 3D code and no model request.
 *
 * It renders one root element. The runtime puts one canvas in it and
 * nothing else; every state's words and controls are the Stage's (28.4).
 */
export function AvatarViewer({
  equipped,
  reducedMotion,
  paused,
  readyCue = 0,
  onStatusChange,
  className,
  ref,
}: AvatarViewerProps & { ref?: Ref<AvatarViewerHandle> }) {
  // Step 2, once per mount: without WebGL 2 nothing else is requested.
  const [noWebGL] = useState(() => !hasWebGL2())
  /** Each attempt is a new runtime: a new canvas and a new renderer. */
  const [attempt, setAttempt] = useState(0)
  const [runtime, setRuntime] = useState<{
    attempt: number
    Component: ComponentType<RuntimeProps>
  } | null>(null)
  const [shellFailure, setShellFailure] = useState<{
    attempt: number
    failure: Failure
  } | null>(null)
  const [runtimeState, setRuntimeState] = useState<{
    attempt: number
    state: RuntimeState
  } | null>(null)
  const [renderers, setRenderers] = useState(0)
  /** `render-error` twice in a row is reported as not retryable (34.4). */
  const [renderErrors, setRenderErrors] = useState(0)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const runtimeHandle = useRef<RuntimeHandle | null>(null)

  // Step 3: the runtime chunk, within its limit. Only for this attempt.
  useEffect(() => {
    if (noWebGL) {
      return
    }
    let settled = false
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true
        setShellFailure({
          attempt,
          failure: { reason: "viewer-load-failed", retryable: true },
        })
      }
    }, CHUNK_LIMIT_MS)

    import("./runtime/AvatarRuntime").then(
      (module) => {
        if (!settled) {
          settled = true
          window.clearTimeout(timer)
          setRuntime({ attempt, Component: module.default })
        }
      },
      () => {
        if (!settled) {
          settled = true
          window.clearTimeout(timer)
          console.warn("The 3D viewer could not be loaded.")
          setShellFailure({
            attempt,
            failure: { reason: "viewer-load-failed", retryable: true },
          })
        }
      },
    )

    return () => {
      settled = true
      window.clearTimeout(timer)
    }
  }, [attempt, noWebGL])

  const handleRuntimeState = useCallback(
    (state: RuntimeState) => {
      if (state.phase === "drawn") {
        setRenderErrors(0)
      } else if (state.failure?.reason === "render-error") {
        setRenderErrors((count) => count + 1)
      }
      setRuntimeState({ attempt, state })
    },
    [attempt],
  )

  const handleRenderError = useCallback(() => {
    setRenderErrors((count) => count + 1)
    setShellFailure({
      attempt,
      failure: { reason: "render-error", retryable: true },
    })
  }, [attempt])

  const handleRendererCreated = useCallback(() => {
    setRenderers((count) => count + 1)
  }, [])

  // Where this attempt is. Anything from an earlier attempt is ignored.
  let failure: Failure | null = null
  if (noWebGL) {
    failure = { reason: "no-webgl", retryable: false }
  } else if (shellFailure?.attempt === attempt) {
    failure = shellFailure.failure
  } else if (
    runtimeState?.attempt === attempt &&
    runtimeState.state.phase === "failed" &&
    runtimeState.state.failure !== undefined
  ) {
    failure = runtimeState.state.failure
  }
  if (failure?.reason === "render-error" && renderErrors >= 2) {
    failure = { ...failure, retryable: false }
  }

  const current = runtimeState?.attempt === attempt ? runtimeState.state : null
  const status = composeStatus(
    failure !== null
      ? { kind: "unavailable", ...failure }
      : current?.phase === "drawn"
        ? {
            kind: "drawn",
            gear: current.gear,
            hasIdle: current.hasIdle,
            hasReady: current.hasReady,
            readyPlaying: current.readyPlaying,
          }
        : { kind: "loading" },
    equipped,
    reducedMotion,
    paused,
  )
  const statusKey = JSON.stringify(status)

  useImperativeHandle(
    ref,
    () => ({
      turnLeft: () => runtimeHandle.current?.turnLeft(),
      turnRight: () => runtimeHandle.current?.turnRight(),
      resetView: () => runtimeHandle.current?.resetView(),
      retry: () => {
        if (status.state === "unavailable") {
          // Restarts at step 3 with a new canvas and renderer.
          if (status.unavailable?.retryable === true) {
            setRuntime(null)
            setAttempt((value) => value + 1)
          }
        } else if (status.state === "partial") {
          runtimeHandle.current?.retryFailedGear()
        }
      },
    }),
    [status.state, status.unavailable?.retryable],
  )

  // Once with the initial status, then only when it changes by content.
  const reported = useRef<string | null>(null)
  const latest = useRef(status)
  useEffect(() => {
    latest.current = status
  })
  useEffect(() => {
    if (reported.current === statusKey) {
      return
    }
    reported.current = statusKey
    onStatusChange(latest.current)
  }, [onStatusChange, statusKey])

  const RuntimeComponent =
    failure === null && runtime?.attempt === attempt ? runtime.Component : null

  return (
    <div
      ref={setHost}
      className={className}
      data-avatar-state={status.state}
      data-avatar-renderer={renderers}
      data-avatar-ready={status.readyClip}
    >
      {RuntimeComponent !== null && host !== null ? (
        <RuntimeBoundary key={attempt} onError={handleRenderError}>
          <RuntimeComponent
            host={host}
            equipped={equipped}
            reducedMotion={reducedMotion}
            paused={paused}
            readyCue={readyCue}
            onState={handleRuntimeState}
            onRendererCreated={handleRendererCreated}
            handleRef={runtimeHandle}
          />
        </RuntimeBoundary>
      ) : null}
    </div>
  )
}

type RuntimeBoundaryProps = { onError: () => void; children: ReactNode }

/**
 * An exception in the runtime is caught here, inside `features/avatar`: the
 * page never unmounts because of it (28.5). It renders nothing.
 */
class RuntimeBoundary extends Component<RuntimeBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Section 28.5: a throwaway canvas must return a `webgl2` context. Software
 * rendering is accepted (`failIfMajorPerformanceCaveat` is false).
 */
function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("webgl2", {
      failIfMajorPerformanceCaveat: false,
    })
    if (context === null) {
      return false
    }
    context.getExtension("WEBGL_lose_context")?.loseContext()
    return true
  } catch {
    return false
  }
}
