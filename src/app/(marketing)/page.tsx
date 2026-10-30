import { Hero } from "@/components/landing/hero";
import { LearningPathPreview } from "@/components/landing/learning-path-preview";
import { DirectionChoice } from "@/components/landing/direction-choice";

export default function Home() {
  return <main id="main"><Hero /><LearningPathPreview /><DirectionChoice /></main>;
}
