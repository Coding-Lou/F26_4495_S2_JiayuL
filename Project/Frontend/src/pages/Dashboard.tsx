import { ArrowRight, Backpack, CalendarDays, CircleUserRound, CloudSun, ListChecks, MapPin, Mountain } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrailDataBadge } from "../components/common/DemoBadge";
import { ErrorState } from "../components/common/AsyncState";
import { TrailCard } from "../components/trails/TrailCard";
import { getErrorMessage } from "../services/api";
import { trailService } from "../services/trailService";
import { userService } from "../services/userService";
import type { Trail } from "../types/trail";

export function Dashboard({ name, authenticated }: { name: string; authenticated: boolean }) {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [trailError, setTrailError] = useState("");
  const [gearCount, setGearCount] = useState<number>();
  const [gearError, setGearError] = useState("");
  useEffect(() => {
    void trailService.list().then((items) => setTrails(items.slice(0, 3))).catch((error: unknown) => setTrailError(getErrorMessage(error)));
    if (authenticated) void userService.getGear().then((items) => setGearCount(items.length)).catch((error: unknown) => setGearError(getErrorMessage(error)));
  }, [authenticated]);

  return <div className="page dashboard-page">
    <section className="dashboard-hero">
      <div className="dashboard-hero__content"><span className="eyebrow">{authenticated ? `Good morning, ${name.split(" ")[0]}` : "Welcome, guest explorer"}</span><h1>Where will your next<br /><em>adventure</em> take you?</h1><p>Get inspired for the trail, then sign in when you're ready to organize your personal gear.</p><div className="hero-actions"><Link to="/pack" className="button button--light">{authenticated ? "Open my gear" : "Try the gear locker"} <ArrowRight size={18} /></Link><Link to="/profile" className="button button--glass">{authenticated ? "View profile" : "Sign in to save"}</Link></div></div>
      <div className="hero-weather"><CloudSun size={32} /><div><span>Vancouver</span><strong>14°</strong><small>Partly cloudy · Demo</small></div></div>
    </section>
    <section className="quick-actions"><Link to="/pack"><span><Backpack /></span><div><strong>Manage my gear</strong><small>{!authenticated ? "Sign in to create your inventory" : gearError ? "Service unavailable" : gearCount === undefined ? "Loading inventory…" : `${gearCount} item${gearCount === 1 ? "" : "s"} ready`}</small></div><ArrowRight /></Link><Link to="/profile"><span><CircleUserRound /></span><div><strong>{authenticated ? "My profile" : "Member access"}</strong><small>{authenticated ? "View your account" : "Log in or create an account"}</small></div><ArrowRight /></Link><Link to="/pack"><span><ListChecks /></span><div><strong>Prepare for the trail</strong><small>Build a reliable packing system</small></div><ArrowRight /></Link></section>
    <div className="section-heading"><div><span className="section-kicker">Guest preview</span><h2>Trail inspiration</h2></div><div className="section-heading__actions"><TrailDataBadge /></div></div>
    {trailError ? <ErrorState message={trailError} /> : <div className="trail-grid trail-grid--three">{trails.map((trail) => <TrailCard key={trail.id} trail={trail} onSelect={() => undefined} />)}</div>}
    <div className="dashboard-lower">
      <section className="panel"><div className="panel__header"><div><span className="section-kicker">Coming up</span><h2>Your next adventure</h2></div><span className="demo-label">Demo itinerary</span></div><div className="trip-row"><div className="date-tile"><strong>12</strong><span>OCT</span></div><div className="trip-row__content"><h3>Golden Ears day hike</h3><p><MapPin size={14} />Maple Ridge, BC</p><div className="trip-progress"><span style={{ width: "72%" }} /></div><small>Gear checklist · 8 of 11 ready</small></div><button className="icon-button"><ArrowRight /></button></div></section>
      <section className="panel weather-panel"><div className="panel__header"><div><span className="section-kicker">Weekend outlook</span><h2>Trail weather</h2></div><span className="demo-label">Demo weather</span></div><div className="forecast"><div><span>SAT</span><CloudSun /><strong>15°</strong><small>Low 8°</small></div><div className="forecast__featured"><span>SUN</span><CloudSun /><strong>17°</strong><small>Low 9°</small></div><div><span>MON</span><CloudSun /><strong>13°</strong><small>Low 7°</small></div></div><p className="weather-note"><Mountain size={15} />Best hiking window: Sunday, 10am–3pm</p></section>
    </div>
    <footer className="dashboard-footer"><CalendarDays size={15} /> Conditions shown are illustrative for the prototype.</footer>
  </div>;
}
