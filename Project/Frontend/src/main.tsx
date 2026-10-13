import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { startAuthSession } from "@/features/auth"
import App from "./App"
import "./index.css"

// Authentication starts once, outside React, so StrictMode's repeated
// effects cannot start it twice. Rendering does not wait for it.
startAuthSession()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
