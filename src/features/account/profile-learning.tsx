"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { lessonHash } from "@/features/course-lesson/lesson-state";
import type { LearningDirection } from "./profile-learning-data";
import { GuestProgressTransfer } from "./progress/client/guest-progress-transfer";
import styles from "./profile-learning.module.css";

const lessonPlural = new Intl.PluralRules("ru");

function DirectionCard({ direction, children }: { direction: LearningDirection; children?: ReactNode }) {
  const headingId = useId();
  const { name, philosopherName, image, completed, total, continueAt, materialsAt } = direction;
  const target = continueAt ?? materialsAt;
  return <article className={styles.direction} aria-labelledby={headingId}>
    <div className={styles.portrait} aria-hidden="true">
      {image ? <Image alt="" src={image} fill sizes="(max-width: 620px) 50px, 76px" /> : <BookOpen size={24} />}
    </div>
    <div className={styles.copy}>
      {philosopherName && <p className={styles.philosopher}>{philosopherName}</p>}
      <h3 id={headingId}>{name}</h3>
      <div className={styles.progressCopy}>
        <span>{completed} из {total} {lessonPlural.select(total) === "one" ? "урока" : "уроков"}</span>
        {completed === total && <span className={styles.complete}>Завершено</span>}
      </div>
      <progress className={styles.progress} aria-label={`Прогресс по направлению «${name}»`} value={completed} max={total} />
    </div>
    <Button asChild size="sm" variant={continueAt ? "default" : "outline"} className={styles.cta}>
      <Link href={`/learn#${lessonHash(target.lessonId, target.sceneId)}`}>
        {continueAt ? "Продолжить обучение" : "Вернуться к материалам"}
      </Link>
    </Button>
    {children}
  </article>;
}

export function ProfileLearning({ directions }: { directions: readonly LearningDirection[] }) {
  const headingId = useId();
  const moreId = useId();
  const [expanded, setExpanded] = useState(false);
  const [first, ...others] = directions;
  const canExpand = others.length > 0;

  return <section className={`glass ${styles.section}`} aria-labelledby={headingId}>
    <div className={styles.heading}>
      <h2 id={headingId}>Твоё обучение</h2>
      {canExpand && <>
        <span className={styles.count} aria-hidden="true">{directions.length}</span>
        <span className="sr-only">Начато направлений: {directions.length}</span>
      </>}
    </div>
    <GuestProgressTransfer />
    {first ? <div>
      <DirectionCard direction={first}>
        {canExpand && <button className={styles.toggle} type="button" aria-controls={moreId} aria-expanded={expanded}
          aria-label={expanded ? "Свернуть направления" : "Показать все направления"}
          onClick={() => setExpanded(value => !value)}>
          <ChevronDown size={19} aria-hidden="true" />
        </button>}
      </DirectionCard>
      {canExpand && <div id={moreId} className={styles.more} data-expanded={expanded} inert={!expanded}>
        <div className={styles.moreClip}>
          <div className={styles.moreList}>
            {others.map(direction => <DirectionCard key={direction.id} direction={direction} />)}
          </div>
        </div>
      </div>}
    </div> : <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true"><BookOpen size={24} strokeWidth={1.6} /></span>
      <h3>Начни изучать философию</h3>
      <p>Выбери направление на карте курса и открой первый урок.</p>
      <Button asChild variant="outline" size="sm"><Link href="/learn">
        Перейти к карте курса <ArrowRight size={15} aria-hidden="true" />
      </Link></Button>
    </div>}
  </section>;
}
