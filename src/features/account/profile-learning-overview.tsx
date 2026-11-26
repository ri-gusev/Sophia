"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { BookOpen, Flame, GraduationCap, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { isoDate } from "../philosophy-question/daily-calendar";
import { createDailyQuizStore, quizStorageKey } from "../philosophy-question/daily-quiz-store";
import { visibleStreak } from "../philosophy-question/daily-streak";
import { ProfileActivityHeatmap } from "./profile-activity-heatmap";
import { useProgressSnapshot } from "./progress/client/lesson-progress-provider";
import styles from "./profile-dashboard.module.css";

const metrics = [
  { key: "streak", label: "Текущая серия", icon: Flame },
  { key: "record", label: "Рекорд серии", icon: Trophy },
  { key: "completed", label: "Завершённые уроки", icon: BookOpen },
  { key: "philosophers", label: "Изучаемые философы", icon: GraduationCap },
] as const;

export function ProfileLearningOverview({ accountId, initialDay, completed, philosophers, activity, revision, children }: {
  accountId: string;
  initialDay: number;
  completed?: number;
  philosophers?: number;
  activity?: Readonly<Record<string, number>>;
  revision?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { revision: syncedRevision } = useProgressSnapshot();
  useEffect(() => {
    // Browser Back can restore a profile page from before the latest committed progress.
    if (revision && syncedRevision && revision !== syncedRevision) router.refresh();
  }, [revision, router, syncedRevision]);

  const [quiz] = useState(() => createDailyQuizStore(initialDay, quizStorageKey(accountId)));
  const { day, progress, status } = useSyncExternalStore(quiz.subscribe, quiz.getSnapshot, quiz.getServerSnapshot);
  const today = isoDate(day);
  const active = progress?.lastDate === today;
  const values = {
    streak: status === "ready" ? visibleStreak(progress, day) : undefined,
    record: status === "ready" ? progress?.maxStreak ?? 0 : undefined,
    completed,
    philosophers,
  };

  return <>
    <section aria-label="Образовательная статистика">
      <dl className={styles.stats}>
        {metrics.map(({ key, label, icon: Icon }) =>
          <div className={styles.stat} key={key} data-stat={key} data-active={key === "streak" ? active : undefined}>
            <dt>{label}</dt>
            <dd><span className={styles.statIcon} aria-hidden="true"><Icon size={21} /></span>{values[key] ?? "—"}</dd>
          </div>)}
      </dl>
    </section>
    {children}
    {activity ? <ProfileActivityHeatmap today={today} activity={activity} /> :
      <section className={`glass ${styles.unavailable}`} aria-labelledby="profile-activity-unavailable">
        <h2 id="profile-activity-unavailable">Активность обучения</h2>
        <p>Календарь временно недоступен.</p>
      </section>}
  </>;
}
