import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhilosophyQuestion } from "@/features/philosophy-question/philosophy-question";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <Reveal className="hero-copy">
        <p className="eyebrow"><span className="status-dot" /> Философия начинается с тебя</p>
        <h1 id="hero-title">Большие вопросы.<br /><span>Маленькие <br className="desktop-break" />уроки.</span></h1>
        <p className="hero-description">Изучай философию через интерактивные задания, великие идеи и интеллектуальные испытания. От первых вопросов Сократа до сложных философских концепций.</p>
        <div className="hero-actions">
          <Button asChild><Link href="/learn">Начать обучение <ArrowUpRight size={19} aria-hidden="true" /></Link></Button>
          <Button asChild variant="ghost"><Link href="/#how-it-works"><span className="circle-arrow"><ArrowDown size={16} aria-hidden="true" /></span>Как это работает</Link></Button>
        </div>
        <p className="hero-note"><BookOpen size={15} aria-hidden="true" /> Первый вопрос — прямо здесь. Без регистрации.</p>
      </Reveal>
      <Reveal className="hero-question">
        <PhilosophyQuestion />
      </Reveal>
    </section>
  );
}
