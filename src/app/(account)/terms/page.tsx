import type { Metadata } from "next";
import { APPROVED_ACCOUNT_EMAIL_DOMAINS } from "@/features/account/account-contract";
import styles from "@/features/account/account.module.css";

export const metadata: Metadata = { title: "Пользовательское соглашение — Sophia" };

export default function TermsPage() {
  return <main id="main" className={`container ${styles.profilePage}`}>
    <article className={`glass ${styles.card} ${styles.journey}`}>
      <h1>Пользовательское соглашение Sophia</h1>
      <h2>Регистрация и доступ к аккаунту</h2>
      <p>Для регистрации аккаунта в Sophia принимаются адреса российских почтовых сервисов «Яндекс Почта», Mail.ru, «Рамблер/почта» и VK Почта на доменах {APPROVED_ACCOUNT_EMAIL_DOMAINS.join(", ")}.</p>
      <p>То же требование применяется к новому адресу при его изменении, если такая возможность доступна. Для активации аккаунта нужно подтвердить адрес по ссылке из письма Sophia.</p>
      <p>Владельцы ранее созданных аккаунтов могут входить и восстанавливать доступ по указанному в аккаунте адресу, в том числе на домене вне списка.</p>
    </article>
  </main>;
}
