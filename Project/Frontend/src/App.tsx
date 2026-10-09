import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLanding } from "./components/auth/AuthLanding";
import { SignInRequired } from "./components/auth/SignInRequired";
import { AppLayout } from "./components/layout/AppLayout";
import keycloak from "./keycloak";
import { Explore } from "./pages/Explore";
import { Home } from "./pages/Home";
import { Memory } from "./pages/Memory";
import { Pack } from "./pages/Pack";
import { Plan } from "./pages/Plan";
import { Profile } from "./pages/Profile";
import { userService } from "./services/userService";

function App({ authAvailable }: { authAvailable: boolean }) {
  const authenticated = Boolean(keycloak.authenticated);
  const [guestMode, setGuestMode] = useState(() => sessionStorage.getItem("otc_guest_mode") === "true");
  const fallbackName = keycloak.tokenParsed?.name as string | undefined ?? keycloak.tokenParsed?.preferred_username as string | undefined ?? "Explorer";
  const [displayName, setDisplayName] = useState(fallbackName);
  useEffect(() => {
    if (authenticated) void userService.getMe().then((profile) => setDisplayName(profile.displayName)).catch(() => undefined);
  }, [authenticated]);

  const login = () => {
    if (!authAvailable) return;
    sessionStorage.removeItem("otc_guest_mode");
    void keycloak.login({ redirectUri: window.location.origin });
  };
  const register = () => {
    if (!authAvailable) return;
    sessionStorage.removeItem("otc_guest_mode");
    void keycloak.register({ redirectUri: window.location.origin });
  };
  const continueAsGuest = () => {
    sessionStorage.setItem("otc_guest_mode", "true");
    setGuestMode(true);
  };
  const leaveGuestMode = () => {
    sessionStorage.removeItem("otc_guest_mode");
    setGuestMode(false);
  };
  const logout = () => {
    sessionStorage.removeItem("otc_guest_mode");
    void keycloak.logout({ redirectUri: window.location.origin });
  };

  if (!authenticated && !guestMode) return <AuthLanding authAvailable={authAvailable} onLogin={login} onRegister={register} onGuest={continueAsGuest} />;

  const locked = (feature: string) => <SignInRequired feature={feature} authAvailable={authAvailable} onLogin={login} onRegister={register} />;

  return <BrowserRouter><AppLayout displayName={authenticated ? displayName : "Guest"} authenticated={authenticated} authAvailable={authAvailable} onLogin={login} onRegister={register} onLogout={logout} onExitGuest={leaveGuestMode}><Routes>
    <Route path="/" element={<Home name={authenticated ? displayName : "Guest"} authenticated={authenticated} />} />
    <Route path="/plan" element={<Plan />} />
    <Route path="/pack" element={authenticated ? <Pack /> : locked("your gear locker")} />
    <Route path="/explore" element={<Explore />} />
    <Route path="/memory" element={<Memory />} />
    <Route path="/profile" element={authenticated ? <Profile /> : locked("your profile")} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppLayout></BrowserRouter>;
}

export default App;
