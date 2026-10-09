export type TrailDifficulty = "Easy" | "Moderate" | "Hard";

export interface GeoJsonLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface Trail {
  id: string;
  name: string;
  location: string;
  difficulty: TrailDifficulty;
  distanceKm: number;
  elevationGainM: number;
  estimatedMinutes: number;
  description: string;
  latitude: number;
  longitude: number;
  geometry?: GeoJsonLineString;
  imageUrl: string;
  tags: string[];
}

export interface TrailFilters {
  search?: string;
  difficulty?: TrailDifficulty | "All";
  maxDistanceKm?: number;
  maxElevationGainM?: number;
}

export interface NearbyTrailParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export type TrailDataMode = "api" | "demo";
