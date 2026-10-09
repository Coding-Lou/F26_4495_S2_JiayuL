import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App.tsx";
import keycloak from "./keycloak";

const root = createRoot(document.getElementById("root")!);

keycloak.init({ onLoad: "check-sso", pkceMethod: "S256", checkLoginIframe: false })
  .then((authenticated) => {
    if (authenticated) keycloak.onTokenExpired = () => { void keycloak.updateToken(30).catch(() => keycloak.login()); };
    root.render(<StrictMode><App authAvailable /></StrictMode>);
  })
  .catch(() => {
    root.render(<StrictMode><App authAvailable={false} /></StrictMode>);
  });
