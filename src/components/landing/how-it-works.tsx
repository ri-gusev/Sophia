import { Compass, MessagesSquare, Sprout } from "lucide-react";
import { HOW_IT_WORKS } from "@/content/landing";
import { Reveal } from "./reveal";

const icons = [Compass, Sprout, MessagesSquare];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="how-section container" aria-labelledby="how-title">
      <Reveal><div className="section-heading"><span className="eyebrow">02 / Просто начать</span><h2 id="how-title">Не заучивать. <span>Понимать.</span></h2><p>Три шага от «почему?» к собственной точке зрения.</p></div></Reveal>
      <div className="steps-grid">{HOW_IT_WORKS.map((step, index) => {
        const Icon = icons[index];
        return <Reveal key={step.title}><article className={`step-card step-${index + 1}`}><div className="step-top"><span className="step-icon"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></span><span className="step-number">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.text}</p></article></Reveal>;
      })}</div>
      <p className="section-footnote">Так мы видим обучение в Sophia. Сейчас можно попробовать демонстрационное упражнение.</p>
    </section>
  );
}
