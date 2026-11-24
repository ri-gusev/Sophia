import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/account/account-navigation";
import { initials } from "@/features/account/account-display";
import { ProfileName } from "@/features/account/profile-name";
import { GuestProgressTransfer } from "@/features/account/progress/client/guest-progress-transfer";
import { readAccountProgress } from "@/features/account/progress/server/store";
import { currentAccount } from "@/features/account/server/viewer";
import { INTRO_LESSONS, type IntroLessonId } from "@/features/course-lesson/lesson-data";
import { PHILOSOPHER_CATALOGS } from "@/features/course-map/philosopher-catalog-data";
import styles from "@/features/account/account.module.css";

export const metadata: Metadata = { title: "Профиль — Sophia", robots: { index: false } };

const course = PHILOSOPHER_CATALOGS.plato.sections[0].blocks.flatMap<IntroLessonId>(block =>
  block.lessons.map(lesson => lesson.contentId));
const dateFormat = new Intl.DateTimeFormat("ru", { dateStyle: "long", timeZone: "UTC" });

export default async function ProfilePage() {
  const user = await currentAccount().catch(() => undefined);
  if (user === null) redirect("/login?next=%2Fprofile");
  if (!user) return <main id="main" className={`container ${styles.profilePage}`}>
    <div className={`glass ${styles.card}`}>
      <h1>Профиль</h1>
      <p role="alert">Профиль временно недоступен. Попробуйте обновить страницу позже.</p>
    </div>
  </main>;

  let progress: ReturnType<typeof readAccountProgress> | undefined;
  try { progress = readAccountProgress(user.id); }
  catch { /* The account details are still available. */ }

  const lessons = course.map(contentId => ({
    lesson: INTRO_LESSONS[contentId], entry: progress?.lessons.find(item => item.lessonId === contentId),
  }));
  const completed = lessons.filter(item => item.entry?.completed).length;
  const confirmedSlides = lessons.reduce((sum, item) => sum + (item.entry?.confirmedSceneIds.length ?? 0), 0);
  const lastOpened = progress?.lastOpened;
  const target = lastOpened
    ? `/learn#lesson=${lastOpened.lessonId}&scene=${lastOpened.sceneId}`
    : `/learn#lesson=${(lessons.find(item => !item.entry?.completed) ?? lessons[0]).lesson.id}`;

  return <main id="main" className={`container ${styles.profilePage}`}>
    <div className={`glass ${styles.card} ${styles.identity}`}>
      <span className={styles.avatar} aria-hidden="true">{initials(user.displayName)}</span>
      <div className={styles.identityCopy}>
        <h1>{user.displayName}</h1>
        <p>{user.email}</p>
        <p>В Sophia с <time dateTime={new Date(user.createdAt).toISOString()}>{dateFormat.format(user.createdAt)}</time></p>
        <div className={styles.actions}>
          <ProfileName accountId={user.id} displayName={user.displayName} />
          <LogoutButton accountId={user.id} className="button button-ghost button-sm" />
        </div>
      </div>
    </div>
    <GuestProgressTransfer />
    <section className={`glass ${styles.card} ${styles.journey}`} aria-labelledby="journey-title">
      <h2 id="journey-title">Мой путь в философии</h2>
      {!progress ? <p role="alert">Прогресс временно недоступен. Попробуйте обновить страницу позже.</p> : <>
        <dl className={styles.stats}>
          <div><dt>Завершено уроков</dt><dd>{completed}</dd></div>
          <div><dt>Подтверждено слайдов</dt><dd>{confirmedSlides}</dd></div>
        </dl>
        {lastOpened && <p>Последний открытый урок — {INTRO_LESSONS[lastOpened.lessonId].title}</p>}
        {!lastOpened && !confirmedSlides && !completed && <p>Ваш путь начинается здесь. Откройте первый урок курса Платона.</p>}
        <h3>Уроки Платона</h3>
        <ul className={styles.lessons}>
          {lessons.map(({ lesson, entry }) => <li key={lesson.id}>
            <Link href={`/learn#lesson=${lesson.id}${entry?.resumeSceneId ? `&scene=${entry.resumeSceneId}` : ""}`}>{lesson.title}</Link>
            <span>{entry?.completed ? "Пройдено" : entry?.legacyCompleted ? "Завершено ранее" : `${entry?.confirmedSceneIds.length ?? 0} из ${lesson.scenes.length} слайдов`}</span>
          </li>)}
        </ul>
        <div><Button asChild><Link href={target}>{lastOpened || confirmedSlides || completed ? "Продолжить обучение" : "Начать первый урок"}</Link></Button></div>
      </>}
    </section>
  </main>;
}
