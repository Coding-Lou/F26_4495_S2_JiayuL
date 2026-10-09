import { Search, SlidersHorizontal, X } from "lucide-react";
import type { TrailDifficulty, TrailFilters as FilterValues } from "../../types/trail";

export function TrailFilters({ filters, onChange }: { filters: FilterValues; onChange: (filters: FilterValues) => void }) {
  const difficulties: Array<TrailDifficulty | "All"> = ["All", "Easy", "Moderate", "Hard"];
  const hasAdvanced = Boolean(filters.maxDistanceKm || filters.maxElevationGainM);
  return <div className="filter-panel">
    <div className="search-box"><Search size={19} /><input value={filters.search ?? ""} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search trails or locations" />{filters.search && <button aria-label="Clear search" onClick={() => onChange({ ...filters, search: "" })}><X size={17} /></button>}</div>
    <div className="difficulty-filter">{difficulties.map((difficulty) => <button key={difficulty} className={(filters.difficulty ?? "All") === difficulty ? "active" : ""} onClick={() => onChange({ ...filters, difficulty })}>{difficulty}</button>)}</div>
    <details className="advanced-filters"><summary><SlidersHorizontal size={17} />More filters{hasAdvanced && <span className="filter-count" />}</summary><div className="advanced-filters__body"><label>Max distance <strong>{filters.maxDistanceKm ?? 15} km</strong><input type="range" min="2" max="25" step="1" value={filters.maxDistanceKm ?? 15} onChange={(event) => onChange({ ...filters, maxDistanceKm: Number(event.target.value) })} /></label><label>Max elevation <strong>{filters.maxElevationGainM ?? 1200} m</strong><input type="range" min="100" max="1500" step="100" value={filters.maxElevationGainM ?? 1200} onChange={(event) => onChange({ ...filters, maxElevationGainM: Number(event.target.value) })} /></label>{hasAdvanced && <button className="text-button" onClick={() => onChange({ ...filters, maxDistanceKm: undefined, maxElevationGainM: undefined })}>Reset filters</button>}</div></details>
  </div>;
}
