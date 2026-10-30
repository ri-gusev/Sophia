import { ArrowUpRight, Route } from "lucide-react";
import Link from "next/link";
import { LEARNING_PATH } from "@/content/landing";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function LearningPathPreview() {
  return (
    <section id="learning" className="learning-section container" aria-labelledby="learning-title">
      <Reveal className="learning-copy"><span className="eyebrow">02 / У каждой идеи есть история</span><h2 id="learning-title">Не просто уроки.<br /><span>Путь к своему<br />взгляду на мир.</span></h2><p>От первого «почему?» до вопросов, на которые человечество всё ещё ищет ответы. Исследуй идеи в их контексте, шаг за шагом.</p><span className="preview-label"><Route size={15} aria-hidden="true" /> Превью основного курса</span><Button asChild variant="outline"><Link href="/learn">Перейти к основному курсу <ArrowUpRight size={17} aria-hidden="true" /></Link></Button></Reveal>
      <Reveal className="learning-visual"><ol className="learning-path">{LEARNING_PATH.map((item, index) => <li key={item.title} className={index === 0 ? "path-first" : ""}><span className="path-node" aria-hidden="true">{item.symbol}</span><div className="path-content"><span className="micro-label">{item.period}</span><h3>{item.title}</h3><p>{item.detail}</p></div><span className="path-index" aria-hidden="true">0{index + 1}</span></li>)}</ol><p className="path-note">Пример последовательности тем. Полные уроки появятся позже.</p></Reveal>
    </section>
  );
}
