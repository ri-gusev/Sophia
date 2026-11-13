import type { PortraitCredit } from "./portrait-credits";

export type AtlasBiography = {
  id: string; name: string; birthYear: number; deathYear: number | null;
  approximateBirth: boolean; approximateDeath: boolean;
  latitude: number; longitude: number; place: string; approximateLocation: boolean;
  locationType: "birth" | "activity" | "other"; locationNote?: string;
  description: string; school: string; source: string;
  additionalSources?: readonly string[]; verifiedAt: string;
};

export type PortraitAsset = {
  path: string; position: string; scale: number; note: string; credit: PortraitCredit;
};

export type AtlasPhilosopher = AtlasBiography & {
  portrait: string | null; portraitPosition: string; portraitScale: number;
  portraitNote: string; credit: PortraitCredit | null;
};
