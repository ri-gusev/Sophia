"use client";

import Image from "next/image";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import type { LessonSceneData, LessonSceneImage } from "./lesson-data";
import { GreeceMap } from "./greece-map";
import styles from "./lesson-scene.module.css";

type LessonSceneProps = {
  scene: LessonSceneData;
  children?: ReactNode;
  navigation?: ReactNode;
};

export function LessonScene({ scene, children, navigation }: LessonSceneProps) {
  const titleId = useId();
  const [layers, setLayers] = useState<{ current: LessonSceneImage; previous: LessonSceneImage | null }>({ current: scene.image, previous: null });
  const [ready, setReady] = useState<string | null>(null);
  if (layers.current.src !== scene.image.src) setLayers({ current: scene.image, previous: layers.current });
  const delay = (index: number): CSSProperties => ({ animationDelay: `${Math.min(index, 7) * 40}ms` });
  const navigationUnderStory = !children || scene.exercisePlacement === "right";
  const sideQuote = scene.quotePlacement === "right";
  const quoteElement = scene.quote && <blockquote className={`${styles.quote} ${sideQuote ? styles.sideQuote : ""} ${styles.reveal}`} style={delay(5)}>
    <p>{scene.quote}</p><footer>{scene.quoteAttribution}</footer>
  </blockquote>;
  const navigationElement = navigation && <nav aria-label="Навигация по уроку"
    className={`${styles.navigation} ${navigationUnderStory ? styles.storyNavigation : ""} ${styles.reveal}`} style={delay(7)}>{navigation}</nav>;
  return <section className={styles.scene} aria-labelledby={titleId} data-testid="lesson-scene" data-scene-id={scene.id}>
    <header className={styles.sceneHeader} data-testid="lesson-scene-header">
    <div className={styles.artwork}>
      {layers.previous && <div key={`previous-${layers.previous.src}`} className={styles.imageLayer}>
        <Image src={layers.previous.src} alt="" aria-hidden="true" fill sizes="(max-width: 760px) 264px, 312px" className={styles.image} style={{ objectPosition: layers.previous.position }} />
      </div>}
      <div key={scene.image.src} className={`${styles.imageLayer} ${styles.currentLayer}`} style={{ opacity: ready === scene.image.src ? 1 : 0 }}>
        <Image src={scene.image.src} alt={scene.imageAlt} fill sizes="(max-width: 760px) 264px, 312px" className={styles.image} style={{ objectPosition: scene.image.position }}
          onLoad={() => setReady(scene.image.src)} onError={() => setReady(null)} data-testid="lesson-artwork" />
      </div>
    </div>
    <h2 key={scene.id} id={titleId} className={`${styles.title} ${styles.reveal}`} style={delay(0)}>{scene.title}</h2>
    </header>
    <div key={scene.id} className={styles.reading} data-exercise-placement={scene.exercisePlacement} data-feedback-placement={scene.feedbackPlacement}>
      {scene.subtitle && <p className={`${styles.subtitle} ${styles.reveal}`} style={delay(2)}>{scene.subtitle}</p>}
      <div data-lesson-narrative data-side-image={scene.portrait?.presentation} className={scene.map ? `${styles.storyLayout} ${styles.mapLayout}` : scene.portrait || sideQuote ? styles.storyLayout : undefined}>
      <div className={styles.contentColumn}>
      <div className={styles.story}>
        {scene.paragraphs.map((paragraph, index) => <p key={`${scene.id}-${index}`} className={styles.reveal} style={delay(index + 2)}>{paragraph}</p>)}
        {scene.type === "completion" && <>
          <ul className={styles.reveal} style={delay(3)} aria-label="Что ты узнал">{scene.bullets.map(item => <li key={item}>{item}</li>)}</ul>
          {scene.closing.map(paragraph => <p key={paragraph} className={styles.reveal} style={delay(4)}>{paragraph}</p>)}
        </>}
        {!sideQuote && quoteElement}
      </div>
      {navigationUnderStory && navigationElement}
      </div>
      {scene.portrait && <figure className={`${styles.portrait} ${styles.reveal}`} style={delay(2)}>
        <Image src={scene.portrait.src} alt={scene.portrait.alt} width={scene.portrait.width} height={scene.portrait.height}
          sizes={scene.portrait.presentation === "story" ? "(max-width: 760px) 380px, (max-width: 1000px) 240px, 400px" : "(max-width: 760px) 220px, (max-width: 1000px) 240px, 320px"} />
      </figure>}
      {scene.map === "greece" && <figure className={`${styles.mapFigure} ${styles.reveal}`} style={delay(2)}><GreeceMap /></figure>}
      {sideQuote && quoteElement}
      </div>
      {children && <div className={`${styles.interaction} ${styles.reveal}`} style={delay(6)}>{children}</div>}
      {!navigationUnderStory && navigationElement}
    </div>
  </section>;
}
