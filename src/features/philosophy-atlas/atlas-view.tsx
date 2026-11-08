"use client";

import { Component, useCallback, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Globe2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AtlasAction, ZoomLimits } from "./globe-config";
import styles from "./philosophy-atlas.module.css";

const EarthGlobe = dynamic(() => import("./earth-globe"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function AtlasView() {
  const [status, setStatus] = useState<"loading" | "ready" | "texture" | "webgl">("loading");
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState<AtlasAction>({ kind: "reset", sequence: 0 });
  const [limits, setLimits] = useState<ZoomLimits>({ near: false, far: false });
  const ready = useCallback(() => setStatus("ready"), []);
  const fail = useCallback((kind: "texture" | "webgl") => setStatus(kind), []);
  const rendererFailed = useCallback(() => setStatus("webgl"), []);
  const changeView = (kind: AtlasAction["kind"]) => setAction((previous) => ({ kind, sequence: previous.sequence + 1 }));
  const hasError = status === "texture" || status === "webgl";

  return (
    <div className={styles.page}>
      <header className="site-header">
        <div className={`header-inner container ${styles.header}`}>
          <Link className="wordmark" href="/" aria-label="Sophia — на главную">sophia<span>.</span></Link>
          <Button asChild variant="outline" size="sm"><Link href="/"><ArrowLeft size={16} aria-hidden="true" />Вернуться на главную</Link></Button>
        </div>
      </header>
      <main id="main" className={styles.main}>
        <div className={styles.intro}>
          <span className="eyebrow"><Globe2 size={14} aria-hidden="true" />Sophia Atlas</span>
          <h1>Философский атлас</h1>
          <p>Мир, открытый для исследования.</p>
        </div>
        <section className={styles.scene} aria-label="Интерактивный глобус" aria-describedby="atlas-keyboard-help" aria-busy={status === "loading"} tabIndex={0} onKeyDown={(event) => {
          if (event.target !== event.currentTarget || status !== "ready") return;
          const keys: Record<string, AtlasAction["kind"]> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", "+": "in", "=": "in", "-": "out", Home: "reset" };
          const kind = keys[event.key];
          if (kind) { event.preventDefault(); changeView(kind); }
        }}>
          <span id="atlas-keyboard-help" className={styles.srOnly}>Клавиши стрелок — вращение, плюс и минус — масштаб, Home — исходный вид.</span>
          <div className={styles.canvas}>
            {!hasError && (
              <SceneBoundary key={attempt} onError={rendererFailed}>
                <EarthGlobe action={action} onReady={ready} onError={fail} onLimitsChange={setLimits} />
              </SceneBoundary>
            )}
          </div>
          {status === "loading" && <div className={styles.message}><span className={styles.spinner} aria-hidden="true" /><p>Загружаем Землю…</p></div>}
          {hasError && (
            <div className={styles.message}>
              <div className={styles.error}>
                <p role="alert">{status === "texture" ? "Не удалось загрузить глобус. Проверь соединение и попробуй снова." : "Не удалось открыть 3D-глобус. Нужна поддержка WebGL и аппаратное ускорение в браузере."}</p>
                <Button type="button" size="sm" onClick={() => { setLimits({ near: false, far: false }); setAction({ kind: "reset", sequence: 0 }); setAttempt((value) => value + 1); setStatus("loading"); }}>Попробовать снова</Button>
              </div>
            </div>
          )}
          <span className={styles.srOnly} role="status">{status === "ready" ? "Глобус готов" : status === "loading" ? "Загружаем Землю…" : ""}</span>
          <div className={styles.sceneFooter}>
            <p id="atlas-help" className={styles.help}><span className={styles.desktopHelp}>Перетаскивай, чтобы вращать · Колесо — масштаб</span><span className={styles.touchHelp}>Один палец — вращение · Два — масштаб</span></p>
            <div className={styles.toolbar} role="group" aria-label="Управление глобусом">
              <Button type="button" variant="ghost" size="sm" aria-label="Приблизить" disabled={status !== "ready" || limits.near} onClick={() => changeView("in")}><Plus size={18} aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="sm" aria-label="Отдалить" disabled={status !== "ready" || limits.far} onClick={() => changeView("out")}><Minus size={18} aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="sm" aria-label="Исходный вид" disabled={status !== "ready"} onClick={() => changeView("reset")}><RotateCcw size={16} aria-hidden="true" /></Button>
            </div>
          </div>
        </section>
        <p className={styles.credit}>Изображение Земли: <a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/" target="_blank" rel="noreferrer">NASA Earth Observatory</a></p>
      </main>
    </div>
  );
}
