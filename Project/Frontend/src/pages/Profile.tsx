import { CalendarDays, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../components/common/AsyncState";
import { PageHeader } from "../components/common/PageHeader";
import keycloak from "../keycloak";
import { getErrorMessage } from "../services/api";
import { userService } from "../services/userService";
import type { UserProfile } from "../types/user";

export function Profile() {
  const [profile, setProfile] = useState<UserProfile>();
  const [error, setError] = useState("");
  useEffect(() => { void userService.getMe().then(setProfile).catch((reason: unknown) => setError(getErrorMessage(reason))); }, []);
  return <div className="page"><PageHeader eyebrow={<span className="live-api-label"><span className="live-dot" />Authenticated with Keycloak</span>} title="Your profile" description="Identity and account details for your outdoor companion." />{!profile && !error ? <LoadingState label="Loading your profile…" /> : error ? <ErrorState message={error} /> : profile && <div className="profile-layout"><section className="profile-card"><div className="profile-avatar">{profile.displayName.split(" ").map((part) => part[0]).join("").slice(0,2)}</div><h2>{profile.displayName}</h2><p>{profile.email}</p><span><ShieldCheck size={15} />Verified outdoor member</span></section><section className="profile-details panel"><h2>Account details</h2><div className="detail-row"><span><UserRound /></span><div><small>Display name</small><strong>{profile.displayName}</strong></div></div><div className="detail-row"><span><Mail /></span><div><small>Email address</small><strong>{profile.email}</strong></div></div><div className="detail-row"><span><KeyRound /></span><div><small>Keycloak subject</small><strong className="mono">{keycloak.subject}</strong></div></div><div className="detail-row"><span><CalendarDays /></span><div><small>Member since</small><strong>{new Date(profile.createdAt).toLocaleDateString("en-CA", { month: "long", year: "numeric" })}</strong></div></div><button className="button button--secondary logout-button" onClick={() => void keycloak.logout({ redirectUri: window.location.origin })}><LogOut size={17} />Log out securely</button></section></div>}</div>;
}
