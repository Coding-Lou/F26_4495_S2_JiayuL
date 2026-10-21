import { useEffect, useState } from "react"

/**
 * Whether something has been going on for at least `ms`. `key` names the
 * thing being waited for: a new key starts the count again, and a wait that
 * ends leaves nothing behind for the next one.
 */
export function useElapsed(active: boolean, key: string, ms: number): boolean {
  const [elapsedFor, setElapsedFor] = useState<string | null>(null)

  useEffect(() => {
    if (!active) {
      return
    }

    const timer = window.setTimeout(() => setElapsedFor(key), ms)
    return () => {
      window.clearTimeout(timer)
      // After this wait is over, so a later wait for the same thing starts
      // from nothing.
      window.setTimeout(() => {
        setElapsedFor((current) => (current === key ? null : current))
      }, 0)
    }
  }, [active, key, ms])

  return active && elapsedFor === key
}
