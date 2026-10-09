import { demoTrails } from "../data/mockTrails";
import type { NearbyTrailParams, Trail, TrailDataMode, TrailFilters } from "../types/trail";
import { apiRequest } from "./api";

const TRAIL_SERVICE_URL = import.meta.env.VITE_TRAIL_SERVICE_URL ?? "/trail-api";
export const trailDataMode: TrailDataMode = import.meta.env.VITE_TRAIL_DATA_MODE === "api" ? "api" : "demo";

export interface TrailServiceClient {
  list(filters?: TrailFilters): Promise<Trail[]>;
  getById(id: string): Promise<Trail>;
  nearby(params: NearbyTrailParams): Promise<Trail[]>;
}

// Paths and query keys mirror the requested service contract. Keep mapping changes here when backend DTOs land.
const apiTrailClient: TrailServiceClient = {
  list(filters = {}) {
    const query = new URLSearchParams();
    if (filters.search) query.set("search", filters.search);
    if (filters.difficulty && filters.difficulty !== "All") query.set("difficulty", filters.difficulty);
    if (filters.maxDistanceKm) query.set("maxDistanceKm", String(filters.maxDistanceKm));
    if (filters.maxElevationGainM) query.set("maxElevationGainM", String(filters.maxElevationGainM));
    return apiRequest<Trail[]>(TRAIL_SERVICE_URL, `/api/trails${query.size ? `?${query.toString()}` : ""}`);
  },
  getById(id) {
    return apiRequest<Trail>(TRAIL_SERVICE_URL, `/api/trails/${encodeURIComponent(id)}`);
  },
  nearby(params) {
    const query = new URLSearchParams({ latitude: String(params.latitude), longitude: String(params.longitude), radiusKm: String(params.radiusKm) });
    return apiRequest<Trail[]>(TRAIL_SERVICE_URL, `/api/trails/nearby?${query.toString()}`);
  },
};

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

const demoTrailClient: TrailServiceClient = {
  async list(filters = {}) {
    const search = filters.search?.trim().toLowerCase();
    return demoTrails.filter((trail) =>
      (!search || trail.name.toLowerCase().includes(search) || trail.location.toLowerCase().includes(search)) &&
      (!filters.difficulty || filters.difficulty === "All" || trail.difficulty === filters.difficulty) &&
      (!filters.maxDistanceKm || trail.distanceKm <= filters.maxDistanceKm) &&
      (!filters.maxElevationGainM || trail.elevationGainM <= filters.maxElevationGainM));
  },
  async getById(id) {
    const trail = demoTrails.find((item) => item.id === id);
    if (!trail) throw new Error("Trail not found.");
    return trail;
  },
  async nearby(params) {
    return demoTrails.filter((trail) => distanceKm(params.latitude, params.longitude, trail.latitude, trail.longitude) <= params.radiusKm);
  },
};

export const trailService: TrailServiceClient = trailDataMode === "api" ? apiTrailClient : demoTrailClient;
