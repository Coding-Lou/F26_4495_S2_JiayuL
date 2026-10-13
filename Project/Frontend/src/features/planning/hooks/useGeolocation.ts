import { useCallback, useRef, useState } from "react"
import type { GeolocationErrorKind } from "../content"

/** Longest a lookup may take once the browser has started it (section 11.2). */
const GEOLOCATION_TIMEOUT_MS = 10_000

export type GeolocationLookup =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "failed"; error: GeolocationErrorKind }

type GeolocationController = {
  lookup: GeolocationLookup
  /** Asks the browser for the device's position. Only ever on user action. */
  locate: () => void
  /** Drops a lookup in progress and any message from the last one. */
  discard: () => void
}

/**
 * The browser's geolocation, used only when the user asks for it (FEATURE-003
 * section 11.2, D5): never on load, on restore, or on send. A failure assumes
 * nothing in its place.
 */
export function useGeolocation(
  onLocated: (latitude: number, longitude: number) => void,
): GeolocationController {
  const [lookup, setLookup] = useState<GeolocationLookup>({ status: "idle" })
  /** Identifies the newest lookup; an answer to an older one is ignored. */
  const latest = useRef(0)

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLookup({ status: "failed", error: "unsupported" })
      return
    }

    latest.current += 1
    const request = latest.current
    setLookup({ status: "locating" })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== latest.current) {
          return
        }

        const { latitude, longitude } = position.coords
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          setLookup({ status: "failed", error: "unavailable" })
          return
        }

        setLookup({ status: "idle" })
        onLocated(latitude, longitude)
      },
      (error) => {
        if (request !== latest.current) {
          return
        }

        let kind: GeolocationErrorKind = "unavailable"
        if (error.code === error.PERMISSION_DENIED) {
          kind = "denied"
        } else if (error.code === error.TIMEOUT) {
          kind = "timeout"
        }
        setLookup({ status: "failed", error: kind })
      },
      { timeout: GEOLOCATION_TIMEOUT_MS },
    )
  }, [onLocated])

  const discard = useCallback(() => {
    latest.current += 1
    setLookup((current) =>
      // A browser that cannot share a location stays that way.
      current.status === "failed" && current.error === "unsupported"
        ? current
        : { status: "idle" },
    )
  }, [])

  return { lookup, locate, discard }
}
