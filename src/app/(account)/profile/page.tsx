import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { ProfileLearning } from "@/features/account/profile-learning";
import { ProfileLibrary } from "@/features/account/profile-library";
import { buildProfileLearning } from "@/features/account/profile-learning-data";
import { ProfileLearningOverview } from "@/features/account/profile-learning-overview";
import { ProfileSettings } from "@/features/account/profile-settings";
import { readAccountLearningProgress } from "@/features/account/progress/server/store";
import { hasMailingConsent } from "@/features/account/server/store";
import { currentAccount } from "@/features/account/server/viewer";
import { getMoscowDay } from "@/features/philosophy-question/daily-calendar";
import { readerCatalog } from "@/features/reader/reader-catalog";
import styles from "@/features/account/profile-dashboard.module.css";

export const metadata: Metadata = { title: "Профиль — София", robots: { index: false } };

const registrationDate = new Intl.DateTimeFormat("ru", {
  day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow",
});

export default async function ProfilePage() {
  const user = await currentAccount().catch(() => undefined);
  if (user === null) redirect("/login?next=%2Fprofile");
  if (!user) return <main id="main" className={`container ${styles.page}`}>
    <div className={`glass ${styles.unavailable}`}>
      <h1>Профиль</h1>
      <p role="alert">Профиль временно недоступен. Попробуйте обновить страницу позже.</p>
    </div>
  </main>;

  const today = getMoscowDay();
  let learning: ReturnType<typeof buildProfileLearning> | undefined;
  try { learning = buildProfileLearning(readAccountLearningProgress(user.id), today); }
  catch { /* The account settings are still available. */ }
  let mailingConsent: boolean | undefined;
  try { mailingConsent = hasMailingConsent(user.id); }
  catch { /* The rest of the profile is still available. */ }

  const firstLetter = Array.from(user.displayName.trim())[0]?.toLocaleUpperCase("ru");
  const parts = registrationDate.formatToParts(user.createdAt);
  const month = parts.find(part => part.type === "month")?.value;
  const year = parts.find(part => part.type === "year")?.value;

  return <main id="main" className={`container ${styles.page}`}>
    <header className={styles.identity}>
      <span className={styles.avatar} aria-hidden="true">{firstLetter}</span>
      <div className={styles.identityCopy}>
        <h1>{user.displayName}</h1>
        <p className={styles.motto}>На пути к мудрости</p>
        <p className={styles.date}>На платформе «София» с <time dateTime={new Date(user.createdAt).toISOString()}>{month} {year}</time></p>
      </div>
      <a className={styles.settingsLink} href="#account-settings" aria-label="Настройки аккаунта">
        <Settings size={20} aria-hidden="true" />
      </a>
    </header>
    <ProfileLearningOverview key={user.id} accountId={user.id} initialDay={today}
      completed={learning?.completed} philosophers={learning?.philosophers} activity={learning?.activity}
      revision={learning?.revision}>
      {learning ? <ProfileLearning directions={learning.directions} /> :
        <section className={`glass ${styles.unavailable}`} aria-labelledby="profile-learning-unavailable">
          <h2 id="profile-learning-unavailable">Твоё обучение</h2>
          <p role="alert">Прогресс временно недоступен. Попробуйте обновить страницу позже.</p>
        </section>}
    </ProfileLearningOverview>
    <ProfileLibrary works={readerCatalog.filter(work => work.sections.length).map(({ id, title, author, translator, cover }) => ({
      id, title, author, translator, cover,
    }))} />
    <ProfileSettings accountId={user.id} displayName={user.displayName} email={user.email} mailingConsent={mailingConsent} />
  </main>;
}
