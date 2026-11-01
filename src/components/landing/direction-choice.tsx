import Link from "next/link";
import { ArrowUpRight, Compass, MessageCircle } from "lucide-react";
import { MAIN_COURSE } from "@/content/landing";
import { Button } from "@/components/ui/button";
import { PhilosopherConversation } from "@/features/philosopher-conversation/philosopher-conversation";
import { Reveal } from "./reveal";

export function DirectionChoice() {
  return (
    <section id="how-it-works" className="how-section container" aria-labelledby="directions-title">
      <Reveal>
        <div className="section-heading">
          <span className="eyebrow">03 / С чего начнём?</span>
          <h2 id="directions-title">Не заучивать. <span>Понимать.</span></h2>
          <p>Выбери направление и начни своё путешествие в философию</p>
        </div>
      </Reveal>
      <div className="steps-grid">
        <Reveal>
          <article className="step-card step-1 direction-card">
            <div className="step-top"><span className="step-icon"><Compass size={24} strokeWidth={1.5} aria-hidden="true" /></span><span className="step-number">01</span></div>
            <h3>{MAIN_COURSE.title}</h3>
            <p>{MAIN_COURSE.description}</p>
            <Button asChild size="sm"><Link href="/learn">Начать курс <ArrowUpRight size={16} aria-hidden="true" /></Link></Button>
          </article>
        </Reveal>
        <Reveal>
          <article className="step-card step-2 direction-card">
            <div className="step-top"><span className="step-icon"><MessageCircle size={24} strokeWidth={1.5} aria-hidden="true" /></span><span className="step-number">02</span></div>
            <h3>Разговор с философом</h3>
            <p>Посмотри на свои вопросы глазами философа. Начнём с Платона — диалог готовится.</p>
            <PhilosopherConversation variant="default" />
          </article>
        </Reveal>
        <Reveal>
          <article className="step-card step-3 direction-card direction-upcoming">
            <h3>—</h3>
            <span className="upcoming-status">Скоро</span>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
