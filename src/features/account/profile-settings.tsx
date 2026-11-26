import Link from "next/link";
import { ChevronDown, LogOut, Mail, ShieldCheck, UserRound, LockKeyhole, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { legalDocuments } from "@/features/legal/contract";
import { LogoutButton } from "./account-navigation";
import { ProfileName } from "./profile-name";
import { ProfileMailings } from "./profile-mailings";
import { ProfilePrivacy } from "./profile-privacy";
import styles from "./profile-settings.module.css";

function SettingsPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <details className={styles.panel}>
    <summary className={styles.row}>
      <span className={styles.icon}><Icon size={17} aria-hidden="true" /></span>
      <span>{title}</span>
      <ChevronDown className={styles.chevron} size={17} aria-hidden="true" />
    </summary>
    <div className={styles.content}>{children}</div>
  </details>;
}

type ProfileSettingsProps = {
  accountId: string;
  displayName: string;
  email: string;
  mailingConsent: boolean | undefined;
};

export function ProfileSettings({ accountId, displayName, email, mailingConsent }: ProfileSettingsProps) {
  return <section className={`glass ${styles.card}`} id="account-settings" aria-labelledby="account-settings-title" tabIndex={-1}>
    <h2 id="account-settings-title" className={styles.title}>Настройки аккаунта</h2>
    <SettingsPanel title="Личные данные" icon={UserRound}>
      <dl className={styles.email}><dt>Email</dt><dd>{email}</dd></dl>
      <ProfileName accountId={accountId} displayName={displayName} />
    </SettingsPanel>
    <SettingsPanel title="Безопасность" icon={ShieldCheck}>
      <p>Чтобы задать новый пароль, запросите ссылку на почту аккаунта.</p>
      <Link className={styles.link} href="/forgot-password">Восстановить пароль</Link>
    </SettingsPanel>
    <SettingsPanel title="Рассылки" icon={Mail}>
      <ProfileMailings accountId={accountId} consent={mailingConsent} />
    </SettingsPanel>
    <SettingsPanel title="Конфиденциальность" icon={LockKeyhole}>
      <div className={styles.legalLinks}>
        <Link className={styles.link} href={legalDocuments.privacy.href}>{legalDocuments.privacy.title}</Link>
        <Link className={styles.link} href={legalDocuments.consent.href}>{legalDocuments.consent.title}</Link>
      </div>
      <ProfilePrivacy accountId={accountId} />
    </SettingsPanel>
    <div className={styles.logout}>
      <LogoutButton accountId={accountId} className={`${styles.row} ${styles.logoutButton}`}
        label="Выйти из аккаунта" icon={<span className={styles.icon}><LogOut size={17} aria-hidden="true" /></span>} />
    </div>
  </section>;
}
