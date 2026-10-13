import { useEffect } from "react"

/**
 * Sets the document title while the calling screen is shown, and follows it
 * as it changes. The title that was there before is put back when the screen
 * goes.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    document.title = title
  }, [title])
}
