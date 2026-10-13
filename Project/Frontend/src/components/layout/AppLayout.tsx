import { NavLink, Outlet } from "react-router-dom"
import { AccountControls, useAuth } from "@/features/auth"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "Home", to: "/home" },
  { label: "Gear", to: "/gear" },
]

export function AppLayout() {
  const { status } = useAuth()

  // The header carries the account only while a session exists (§21.4).
  const hasAccount = status === "authenticated" || status === "signing-out"
  const signingOut = status === "signing-out"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div
          className={cn(
            "mx-auto flex max-w-5xl items-center px-6 py-4",
            // Two rows below 640px, one row from there (§21.4.1).
            hasAccount
              ? "flex-wrap gap-x-6 gap-y-2 sm:flex-nowrap"
              : "justify-between",
          )}
        >
          <span
            className={cn(
              "font-semibold",
              hasAccount && "basis-full sm:mr-auto sm:shrink-0 sm:basis-auto",
            )}
          >
            Outdoor Trip Companion
          </span>
          <nav
            aria-label="Primary navigation"
            className={cn("flex gap-4 text-sm", hasAccount && "shrink-0")}
          >
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/home"}
                className={({ isActive }) =>
                  cn(
                    "text-muted-foreground hover:text-foreground",
                    isActive && "font-medium text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <AccountControls />
        </div>
      </header>
      {/* While sign-out is in flight the page stays, but cannot be used. */}
      <main
        className="auth-layout-main mx-auto max-w-5xl px-6 py-10"
        inert={signingOut}
        aria-busy={signingOut ? true : undefined}
      >
        <Outlet />
      </main>
    </div>
  )
}
