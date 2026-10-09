import { Clock3, MapPin, Mountain } from "lucide-react";
import type { Trail } from "../../types/trail";

export function TrailResultCard({ trail, onSelect }: { trail: Trail; onSelect?: (trail: Trail) => void }) {
  return <article className="ai-trail-result">
    <span className="ai-trail-result__image" style={{ backgroundImage: `url("${trail.imageUrl}")` }} />
    <div><span><MapPin size={12} />{trail.location}</span><h3>{trail.name}</h3><div><small>{trail.distanceKm} km</small><small><Mountain size={12} />{trail.elevationGainM} m</small><small><Clock3 size={12} />{trail.estimatedMinutes} min</small></div></div>
    {onSelect && <button onClick={() => onSelect(trail)}>View trail</button>}
  </article>;
}
