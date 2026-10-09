import { Crosshair, MapPin, Navigation, Radius, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { TrailDataBadge } from "../components/common/DemoBadge";
import { ErrorState, LoadingState } from "../components/common/AsyncState";
import { PageHeader } from "../components/common/PageHeader";
import { TrailMap } from "../components/trails/TrailMap";
import { getErrorMessage } from "../services/api";
import { trailService } from "../services/trailService";
import type { Trail } from "../types/trail";

const VANCOUVER = { latitude: 49.2827, longitude: -123.1207 };

export function Explore() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selected, setSelected] = useState<Trail>();
  const [radius, setRadius] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationLabel, setLocationLabel] = useState("Vancouver, BC");
  const [origin, setOrigin] = useState(VANCOUVER);
  const [requestId, setRequestId] = useState(0);
  useEffect(() => {
    let active = true;
    void trailService.nearby({ ...origin, radiusKm: radius }).then((items) => { if (active) { setTrails(items); setSelected(items[0]); } }).catch((reason: unknown) => { if (active) setError(getErrorMessage(reason)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [origin, radius, requestId]);
  const retry = () => { setLoading(true); setError(""); setRequestId((value) => value + 1); };
  const useLocation = () => navigator.geolocation?.getCurrentPosition((position) => { setLoading(true); setError(""); setLocationLabel("Your current location"); setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude }); }, () => setError("Location access was not available. You can continue exploring from Vancouver."));

  return <div className="page explore-page"><PageHeader eyebrow={<TrailDataBadge />} title="Explore the wild nearby" description="See trailheads and routes around your selected location." actions={<button className="button button--secondary" onClick={useLocation}><Crosshair size={17} />Use my location</button>} />
    <div className="explore-layout"><aside className="explore-sidebar"><div className="location-control"><label>SEARCH ORIGIN</label><div><MapPin size={18} /><span>{locationLabel}</span></div></div><div className="radius-control"><div><label><Radius size={16} />Search radius</label><strong>{radius} km</strong></div><input type="range" min="5" max="60" step="5" value={radius} onChange={(event) => { setLoading(true); setError(""); setRadius(Number(event.target.value)); }} /></div><div className="nearby-heading"><strong>{loading ? "Searching…" : `${trails.length} nearby trails`}</strong><small>Click a route to focus the map</small></div>{loading ? <LoadingState label="Searching nearby…" /> : error ? <ErrorState message={error} onRetry={retry} /> : <div className="nearby-list">{trails.map((trail) => <button key={trail.id} className={selected?.id === trail.id ? "active" : ""} onClick={() => setSelected(trail)}><span className="nearby-list__image" style={{ backgroundImage: `url("${trail.imageUrl}")` }} /><span><strong>{trail.name}</strong><small>{trail.location}</small><span className="mini-stats">{trail.distanceKm} km · {trail.elevationGainM} m · {trail.difficulty}</span></span><Navigation size={17} /></button>)}</div>}<div className="hiker-demo"><span><Users size={19} /></span><div><strong>Community activity</strong><p><b>12 hikers</b> shown for concept demonstration only. No people are being tracked.</p></div><em>DEMO</em></div></aside><div className="explore-map-wrap"><TrailMap trails={trails} selected={selected} onSelect={setSelected} className="explore-map" />{selected && <div className="floating-trail-card"><div><span className={`difficulty difficulty--${selected.difficulty.toLowerCase()}`}>{selected.difficulty}</span><h3>{selected.name}</h3><p>{selected.description}</p><div><span>{selected.distanceKm} km</span><span>{selected.elevationGainM} m gain</span><span>{Math.round(selected.estimatedMinutes / 60 * 10) / 10} hr</span></div></div><button className="button button--primary">View trail</button></div>}</div></div>
  </div>;
}
