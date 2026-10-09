import { ArrowUpRight, Clock3, MapPin, Mountain } from "lucide-react";
import type { Trail } from "../../types/trail";

export function TrailCard({ trail, selected, onSelect }: { trail: Trail; selected?: boolean; onSelect: () => void }) {
  return <article className={`trail-card ${selected ? "trail-card--selected" : ""}`} onClick={onSelect}>
    <div className="trail-card__image" style={{ backgroundImage: `url("${trail.imageUrl}")` }}><span className={`difficulty difficulty--${trail.difficulty.toLowerCase()}`}>{trail.difficulty}</span><button aria-label={`View ${trail.name}`}><ArrowUpRight size={18} /></button></div>
    <div className="trail-card__body"><div className="trail-card__location"><MapPin size={14} />{trail.location}</div><h3>{trail.name}</h3><p>{trail.description}</p><div className="trail-stats"><span><strong>{trail.distanceKm}</strong> km</span><span><Mountain size={15} /><strong>{trail.elevationGainM}</strong> m</span><span><Clock3 size={15} /><strong>{Math.floor(trail.estimatedMinutes / 60)}h {trail.estimatedMinutes % 60 || ""}</strong></span></div></div>
  </article>;
}
