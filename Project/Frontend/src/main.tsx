import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import keycloak from "./keycloak";

keycloak
    .init({
        onLoad: "login-required",
        pkceMethod: "S256",
    })
    .then((authenticated) => {
        if (!authenticated) {
            window.location.reload();
            return;
        }

        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <App />
            </StrictMode>
        );
    })
    .catch((error) => {
        console.error("Keycloak initialization failed", error);
    });