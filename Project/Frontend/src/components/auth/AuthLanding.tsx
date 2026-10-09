import { ArrowRight, Backpack, Compass, LogIn, Mountain, ShieldCheck, UserPlus } from "lucide-react";

interface AuthLandingProps {
  authAvailable: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onGuest: () => void;
}

export function AuthLanding({ authAvailable, onLogin, onRegister, onGuest }: AuthLandingProps) {
  return <main className="auth-landing">
    <section className="auth-landing__visual">
      <div className="auth-brand"><span><Mountain size={23} /></span><div><strong>Outdoor</strong><small>Trip Companion</small></div></div>
      <div className="auth-landing__message"><span className="eyebrow">Vancouver starts here</span><h1>Plan less.<br /><em>Explore more.</em></h1><p>Your companion for better-prepared hikes and more memorable weekends outside.</p></div>
      <div className="auth-features"><span><Compass size={18} />Discover local trails</span><span><Backpack size={18} />Organize your gear</span><span><ShieldCheck size={18} />Secure with Keycloak</span></div>
    </section>
    <section className="auth-landing__panel">
      <div className="auth-card">
        <span className="auth-card__icon"><Mountain size={25} /></span>
        <p className="auth-card__kicker">WELCOME TO YOUR NEXT ADVENTURE</p>
        <h2>Ready to head outside?</h2>
        <p className="auth-card__copy">Sign in to access your gear and profile, or take a look around as a guest.</p>
        {!authAvailable && <div className="auth-notice">Keycloak is currently unavailable. Guest mode is still available.</div>}
        <div className="auth-card__actions">
          <button className="button button--primary auth-primary" disabled={!authAvailable} onClick={onLogin}><LogIn size={18} />Log in<ArrowRight size={17} /></button>
          <button className="button button--secondary" disabled={!authAvailable} onClick={onRegister}><UserPlus size={18} />Create account</button>
          <div className="auth-divider"><span>or</span></div>
          <button className="guest-button" onClick={onGuest}>Continue as guest <ArrowRight size={16} /></button>
        </div>
        <small className="auth-privacy"><ShieldCheck size={13} />Authentication is securely handled by Keycloak.</small>
      </div>
    </section>
  </main>;
}
