import { LockKeyhole, LogIn, UserPlus } from "lucide-react";

export function SignInRequired({ feature, authAvailable, onLogin, onRegister }: { feature: string; authAvailable: boolean; onLogin: () => void; onRegister: () => void }) {
  return <div className="page protected-page"><section className="protected-card"><span><LockKeyhole size={28} /></span><p className="section-kicker">MEMBERS ONLY</p><h1>Sign in to use {feature}</h1><p>Your personal gear and profile are securely connected to your account. Guest activity is never sent to the User Service.</p>{!authAvailable && <div className="auth-notice">Keycloak is unavailable. Start it and reload this page to sign in.</div>}<div><button className="button button--primary" disabled={!authAvailable} onClick={onLogin}><LogIn size={17} />Log in</button><button className="button button--secondary" disabled={!authAvailable} onClick={onRegister}><UserPlus size={17} />Create account</button></div></section></div>;
}
