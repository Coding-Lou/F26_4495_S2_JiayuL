import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Map, Route } from "lucide-react";
import { TrailDataBadge } from "../components/common/DemoBadge";
import { EmptyState, ErrorState, LoadingState } from "../components/common/AsyncState";
import { PageHeader } from "../components/common/PageHeader";
import { TrailCard } from "../components/trails/TrailCard";
import { TrailFilters } from "../components/trails/TrailFilters";
import { TrailMap } from "../components/trails/TrailMap";
import { getErrorMessage } from "../services/api";
import { trailService } from "../services/trailService";
import type { Trail, TrailFilters as FilterValues } from "../types/trail";

export function Plan() {
  const [filters, setFilters] = useState<FilterValues>({ difficulty: "All" });
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selected, setSelected] = useState<Trail>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const items = await trailService.list(filters); setTrails(items); setSelected((current) => items.find((item) => item.id === current?.id) ?? items[0]); } catch (reason) { setError(getErrorMessage(reason)); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);

  return <div className="page"><PageHeader eyebrow={<TrailDataBadge />} title="Find your next trail" description="Search Vancouver's mountains, compare the essentials, and choose a route that fits your day." actions={<button className="button button--secondary"><Route size={17} />My plans</button>} />
    <TrailFilters filters={filters} onChange={setFilters} />
    <div className="plan-layout"><section><div className="results-heading"><div><strong>{loading ? "Searching…" : `${trails.length} trail${trails.length === 1 ? "" : "s"} found`}</strong><span>Near Metro Vancouver</span></div><button className="map-toggle"><Map size={17} />Map view</button></div>{loading ? <LoadingState label="Finding the best routes…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : trails.length === 0 ? <EmptyState title="No trails match" message="Try widening the distance or elevation filters." /> : <div className="trail-list">{trails.map((trail) => <TrailCard key={trail.id} trail={trail} selected={selected?.id === trail.id} onSelect={() => setSelected(trail)} />)}</div>}</section>
      <aside className="plan-map"><TrailMap trails={trails} selected={selected} onSelect={setSelected} />{selected && <div className="map-selection"><div><span className={`difficulty difficulty--${selected.difficulty.toLowerCase()}`}>{selected.difficulty}</span><h3>{selected.name}</h3><p>{selected.distanceKm} km · {selected.elevationGainM} m gain</p></div><button className="round-arrow"><ArrowRight size={18} /></button></div>}</aside></div>
  </div>;
}
