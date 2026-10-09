import type { GearInput, GearItem, UserProfile } from "../types/user";
import { apiRequest } from "./api";

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL ?? "/user-api";

export const userService = {
  getMe: () => apiRequest<UserProfile>(USER_SERVICE_URL, "/api/users/me"),
  getGear: () => apiRequest<GearItem[]>(USER_SERVICE_URL, "/api/users/me/gear"),
  createGear: (input: GearInput) => apiRequest<GearItem>(USER_SERVICE_URL, "/api/users/me/gear", { method: "POST", body: JSON.stringify(input) }),
  updateGear: (gearId: string, input: GearInput) => apiRequest<GearItem>(USER_SERVICE_URL, `/api/users/me/gear/${encodeURIComponent(gearId)}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteGear: (gearId: string) => apiRequest<void>(USER_SERVICE_URL, `/api/users/me/gear/${encodeURIComponent(gearId)}`, { method: "DELETE" }),
};
