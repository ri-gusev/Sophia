import { ArrowUpRight, Globe2 } from "lucide-react";
import { ATLAS_POINTS } from "@/content/landing";
import { Reveal } from "./reveal";

export function AtlasPreview() {
  return (
    <section id="atlas" className="atlas-section container" aria-labelledby="atlas-title">
      <Reveal><div className="atlas-panel"><div className="atlas-copy"><span className="eyebrow">04 / Идеи не знают границ</span><h2 id="atlas-title">Философия. <br />В пространстве <br /><span>и времени.</span></h2><p>Увидеть, где рождались идеи. Понять, как они путешествовали между эпохами, странами и людьми.</p><span className="preview-label"><Globe2 size={15} aria-hidden="true" /> Концепция исторического атласа</span><a href="#atlas-timeline" className="text-link">Взглянуть на связь эпох <ArrowUpRight size={17} aria-hidden="true" /></a></div>
      <div className="atlas-visual"><div className="atlas-map" role="img" aria-label="Схематичная карта Европы: Платон — Афины, Рене Декарт — Франция, Иммануил Кант — Кёнигсберг. Расположение условное.">
        <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#a1b9b6" strokeOpacity=".19" /></pattern></defs><rect width="600" height="360" fill="url(#map-grid)"/><g fill="#e1e8dc" stroke="#b9cbbd" strokeWidth="1.2"><path d="M162 80l24-27 20 18 8 33-17 27 16 18-12 22-24-9-12-34 9-15z"/><path d="M220 253l-29-16 8-42 31-11 3-37 28-20 34 3 19-18 32 8 21-21 45 4 29 24 49-8 27 38-23 36-43 3-22 33-45-5-24 31-34-10-21 14-27-14-34 17z"/><path d="M321 227l23 11 4 30 26 23-9 14-26-26-9-25-16-12z"/><path d="M385 232l18 12-3 24 16 12-6 12-17-9-9-24-14-8z"/><path d="M306 103l8-52 26-25 16 8-18 41 8 31-18 13z"/><path d="M355 99l5-49 27-27 20 16-12 34 20 24-17 21z"/></g><g fill="none" stroke="#789a8a" strokeWidth="1.5" strokeDasharray="4 6"><path d="M390 267Q220 278 210 194Q238 90 438 100"/></g><circle cx="210" cy="194" r="40" fill="#bcefe0" opacity=".35"/><circle cx="390" cy="267" r="40" fill="#f9e8aa" opacity=".4"/><circle cx="438" cy="100" r="35" fill="#d9ddf8" opacity=".5"/></svg>
        {ATLAS_POINTS.map((point) => <div key={point.name} className={`map-point ${point.className}`} style={{ left: point.left, top: point.top }}><span className="map-pin" /><div className="map-label"><strong>{point.name}</strong><span>{point.place}</span></div></div>)}
        <span className="map-caption">Европа · условная схема</span><span className="map-compass" aria-hidden="true">N ↑</span>
      </div><ol id="atlas-timeline" className="atlas-timeline">{ATLAS_POINTS.map((point) => <li key={point.name}><span className="timeline-dot" /><span>{point.era}</span><strong>{point.name}</strong></li>)}</ol><p className="atlas-note">Превью: карта и шкала иллюстрируют концепцию, а не готовый инструмент.</p></div>
      </div></Reveal>
    </section>
  );
}
