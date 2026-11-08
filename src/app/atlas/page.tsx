import type { Metadata } from "next";
import { AtlasView } from "@/features/philosophy-atlas/atlas-view";

export const metadata: Metadata = {
  title: "Философский атлас — Sophia",
  description: "Исследуй Землю: вращай глобус и меняй масштаб.",
};

export default function AtlasPage() {
  return <AtlasView />;
}
