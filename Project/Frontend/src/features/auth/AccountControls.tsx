import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authContent } from "./authContent"
import { signOut } from "./authSession"
import { useAuth } from "./useAuth"

/**
 * Who is signed in, and Sign out (FEATURE-002 §8, §21.4.1, §21.4.2). Rendered
 * in the application layout's header, and only while a session exists: a
 * signed-out visitor sees no account information.
 *
 * The name is a text node, never markup (S13). Sign-out is immediate; there
 * is no confirmation dialog.
 */
export function AccountControls() {
  const { status, displayName } = useAuth()

  if (status !== "authenticated" && status !== "signing-out") {
    return null
  }

  const signingOut = status === "signing-out"

  return (
    <div className="auth-account">
      {displayName !== null ? (
        <span className="auth-identity">
          <span className="sr-only">{authContent.signedInAs}</span>
          {displayName}
        </span>
      ) : null}

      {/* Not `disabled` while working: the control keeps focus and its name. */}
      <Button
        type="button"
        variant="outline"
        className="auth-sign-out"
        aria-disabled={signingOut ? true : undefined}
        data-state={signingOut ? "working" : undefined}
        onClick={() => {
          if (!signingOut) {
            void signOut()
          }
        }}
      >
        {signingOut ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              strokeWidth={2}
              className="auth-spinner"
            />
            {authContent.waiting.signingOut}
          </>
        ) : (
          authContent.actions.signOut
        )}
      </Button>

      {/* W3 is announced once. The region exists, empty, before it is needed. */}
      <p role="status" className="sr-only">
        {signingOut ? authContent.waiting.signingOut : ""}
      </p>
    </div>
  )
}
