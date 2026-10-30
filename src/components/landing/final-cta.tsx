import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function FinalCTA() {
  return <section className="final-section container" aria-labelledby="final-title"><Reveal><span className="final-star" aria-hidden="true">✳</span><span className="eyebrow">Любопытство — хорошая отправная точка</span><h2 id="final-title">Каждый великий вопрос<br />начинается <span>с любопытства.</span></h2><p>Не нужно знать ответы. Достаточно захотеть спросить.</p><Button asChild><a href="#exercise">Попробовать Sophia <ArrowUpRight size={18} aria-hidden="true" /></a></Button><span className="final-note">Одно упражнение. Маленькое открытие.</span></Reveal></section>;
}
