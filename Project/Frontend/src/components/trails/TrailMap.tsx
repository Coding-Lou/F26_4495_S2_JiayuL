import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Trail } from "../../types/trail";

const markerIcon = L.divIcon({ className: "trail-marker", html: '<span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 3 4 8 5-5 4 15H3L8 3Z"/></svg></span>', iconSize: [38, 44], iconAnchor: [19, 42] });

function MapFocus({ trail }: { trail?: Trail }) {
  const map = useMap();
  useEffect(() => { if (trail) map.flyTo([trail.latitude, trail.longitude], 13, { duration: 0.8 }); }, [map, trail]);
  return null;
}

export function TrailMap({ trails, selected, onSelect, className = "" }: { trails: Trail[]; selected?: Trail; onSelect?: (trail: Trail) => void; className?: string }) {
  const route = selected?.geometry?.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  return <div className={`map-frame ${className}`}>
    <MapContainer center={[49.34, -123.08]} zoom={10} scrollWheelZoom className="leaflet-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapFocus trail={selected} />
      {trails.map((trail) => <Marker key={trail.id} position={[trail.latitude, trail.longitude]} icon={markerIcon} eventHandlers={{ click: () => onSelect?.(trail) }}><Popup><strong>{trail.name}</strong><br />{trail.distanceKm} km · {trail.difficulty}</Popup></Marker>)}
      {route && <Polyline positions={route} pathOptions={{ color: "#185a3b", weight: 5, opacity: .9 }} />}
    </MapContainer>
  </div>;
}
