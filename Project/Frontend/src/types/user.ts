export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface GearItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  createdAt: string;
}

export interface GearInput {
  name: string;
  category: string;
  description: string;
}
