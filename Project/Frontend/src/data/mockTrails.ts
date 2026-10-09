import type { Trail } from "../types/trail";

// Temporary presentation data only, selected explicitly with VITE_TRAIL_DATA_MODE=demo.
// The app never switches to this data after an API failure.
export const demoTrails: Trail[] = [
  {
    id: "demo-grouse-grind", name: "Grouse Grind", location: "North Vancouver", difficulty: "Hard",
    distanceKm: 2.5, elevationGainM: 800, estimatedMinutes: 135,
    description: "A famously steep forest climb up Grouse Mountain with rewarding views over Vancouver at the summit.",
    latitude: 49.3723, longitude: -123.0987,
    geometry: { type: "LineString", coordinates: [[-123.1018,49.3710],[-123.1007,49.3745],[-123.0999,49.3783],[-123.0986,49.3824]] },
    imageUrl: "https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=1200&q=85",
    tags: ["Forest", "Workout", "Views"],
  },
  {
    id: "demo-dog-mountain", name: "Dog Mountain", location: "Mount Seymour", difficulty: "Moderate",
    distanceKm: 5, elevationGainM: 165, estimatedMinutes: 120,
    description: "A friendly out-and-back through old-growth forest to a rocky viewpoint above the city and harbour.",
    latitude: 49.3676, longitude: -122.9491,
    geometry: { type: "LineString", coordinates: [[-122.9480,49.3652],[-122.9518,49.3677],[-122.9557,49.3701],[-122.9589,49.3719]] },
    imageUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85",
    tags: ["Dog friendly", "Forest", "Viewpoint"],
  },
  {
    id: "demo-quarry-rock", name: "Quarry Rock", location: "Deep Cove", difficulty: "Easy",
    distanceKm: 3.8, elevationGainM: 100, estimatedMinutes: 90,
    description: "A scenic section of the Baden Powell Trail leading to a granite bluff above Indian Arm.",
    latitude: 49.3264, longitude: -122.9391,
    geometry: { type: "LineString", coordinates: [[-122.9486,49.3260],[-122.9454,49.3279],[-122.9418,49.3286],[-122.9391,49.3264]] },
    imageUrl: "https://images.unsplash.com/photo-1443632864897-14973fa006cf?auto=format&fit=crop&w=1200&q=85",
    tags: ["Ocean views", "Family", "Forest"],
  },
  {
    id: "demo-st-marks", name: "St. Mark's Summit", location: "Cypress Mountain", difficulty: "Moderate",
    distanceKm: 11, elevationGainM: 460, estimatedMinutes: 300,
    description: "A classic Howe Sound Crest Trail hike ending at panoramic cliffs over the islands and ocean.",
    latitude: 49.3961, longitude: -123.2115,
    geometry: { type: "LineString", coordinates: [[-123.2027,49.3957],[-123.2052,49.3975],[-123.2089,49.3983],[-123.2115,49.3961]] },
    imageUrl: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=85",
    tags: ["Ocean views", "Full day", "Summit"],
  },
];
