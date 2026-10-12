import { NavLink, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "Home", to: "/home" },
  { label: "Gear", to: "/gear" },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold">Outdoor Trip Companion</span>
          <nav aria-label="Primary navigation" className="flex gap-4 text-sm">
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
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
