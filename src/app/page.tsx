import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { PhilosophyQuiz } from "@/components/landing/philosophy-quiz";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LearningPathPreview } from "@/components/landing/learning-path-preview";
import { AtlasPreview } from "@/components/landing/atlas-preview";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return <div id="top"><Header /><main id="main"><Hero /><div className="idea-ribbon container" aria-label="Темы для размышления"><span>Что значит знать?</span><i aria-hidden="true">✦</i><span>Как жить хорошо?</span><i aria-hidden="true">✦</i><span>Свободны ли мы?</span><i aria-hidden="true">✦</i><span>Что делает нас людьми?</span></div><PhilosophyQuiz /><HowItWorks /><LearningPathPreview /><AtlasPreview /><FinalCTA /></main><Footer /></div>;
}
