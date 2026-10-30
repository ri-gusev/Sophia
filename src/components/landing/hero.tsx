import { ArrowDown, ArrowUpRight, BookOpen, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <Reveal className="hero-copy">
        <p className="eyebrow"><span className="status-dot" /> Философия начинается с тебя</p>
        <h1 id="hero-title">Большие вопросы.<br /><span>Маленькие <br className="desktop-break" />уроки.</span></h1>
        <p className="hero-description">Изучай философию через интерактивные задания, великие идеи и интеллектуальные испытания. От первых вопросов Сократа до сложных философских концепций.</p>
        <div className="hero-actions">
          <Button asChild><a href="#exercise">Начать обучение <ArrowUpRight size={19} aria-hidden="true" /></a></Button>
          <Button asChild variant="ghost"><a href="#how-it-works"><span className="circle-arrow"><ArrowDown size={16} aria-hidden="true" /></span>Как это работает</a></Button>
        </div>
        <p className="hero-note"><BookOpen size={15} aria-hidden="true" /> Первый вопрос — прямо здесь. Без регистрации.</p>
      </Reveal>
      <Reveal className="hero-art">
        <div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" />
        <span className="art-spark spark-one" aria-hidden="true">✳</span><span className="art-spark spark-two" aria-hidden="true">✦</span>
        <div className="progress-preview glass">
          <div className="progress-icon"><Sparkles size={22} aria-hidden="true" /></div>
          <div><span className="micro-label">Пример учебного прогресса</span><strong>Любопытство — уже начало</strong><div className="progress-track" aria-hidden="true"><span /></div></div>
        </div>
        <div className="thought-card glass">
          <div className="thought-top"><span className="pill">Искусство задавать вопросы</span><span className="micro-label">Демо · 01</span></div>
          <div className="column-illustration" aria-hidden="true">
            <svg viewBox="0 0 190 160" fill="none"><ellipse cx="95" cy="148" rx="71" ry="10" fill="#95bdb3" opacity=".16"/><path d="M50 133h91v10H50z" fill="#d1ddd2"/><path d="M58 124h75v10H58z" fill="#edf0dd"/><path d="M68 57h55v67H68z" fill="#e9edda"/><path d="M75 60v59m12-59v59m12-59v59m12-59v59" stroke="#b5c7b1" strokeWidth="4"/><path d="M61 49h69v12H61z" fill="#eff2e2"/><path d="M65 42c-19-22-35 8-15 10 12 0 6-14-2-8m77-2c19-22 35 8 15 10-12 0-6-14 2-8" stroke="#b7cbb9" strokeWidth="7" strokeLinecap="round"/><path d="M65 41h60" stroke="#d9e4cc" strokeWidth="9"/><path d="M75 29h40" stroke="#e8eddb" strokeWidth="10" strokeLinecap="round"/></svg>
          </div>
          <p className="thought-question">А что, если сомнение —<br />первый шаг к знанию?</p>
          <div className="thought-bottom"><span><span className="small-check"><Check size={12} aria-hidden="true" /></span> Здесь можно не знать</span><span className="round-arrow" aria-hidden="true"><ArrowUpRight size={19} /></span></div>
        </div>
        <div className="era-preview glass"><span className="era-dot" /><div><span className="micro-label">Путешествие сквозь идеи</span><strong>Античность <span aria-hidden="true">⟶</span> Наши дни</strong></div></div>
        <span className="curiosity-sticker" aria-hidden="true">stay<br /><em>curious.</em></span>
        <p className="art-caption">Так может выглядеть твой путь. Превью интерфейса.</p>
      </Reveal>
    </section>
  );
}
