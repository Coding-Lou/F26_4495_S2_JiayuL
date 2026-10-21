import { Component, type ReactNode } from "react"
import { useFrame, type RootState } from "@react-three/fiber"

/** The controller's per-frame entry, as seen from the R3F root. */
type FrameTarget = { frame(state: RootState, delta: number): void }

/** Drives the controller's per-frame work inside the R3F root. */
export function FrameDriver({ controller }: { controller: FrameTarget }) {
  useFrame((state, delta) => controller.frame(state, delta))
  return null
}

type RenderGuardProps = { onError: () => void; children: ReactNode }

/**
 * An exception in the scene is caught here, inside `features/avatar`; the
 * page never unmounts because of it (28.5).
 */
export class RenderGuard extends Component<RenderGuardProps, { failed: boolean }> {
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
