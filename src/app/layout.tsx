import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/manrope";
import "./globals.css";
import { PlatoChatProvider } from "@/features/philosopher-conversation/plato-chat-provider";
import { isAiChatEnabled } from "@/features/philosopher-conversation/server/chat-access";
import { AccountViewer } from "@/features/account/account-viewer";
import { LessonProgressProvider } from "@/features/account/progress/client/lesson-progress-provider";
import { canUseAiChat } from "@/features/account/server/session";
import { currentAccount } from "@/features/account/server/viewer";
import { legalDocuments, siteAgeCategory } from "@/features/legal/contract";

const SUPPORT_EMAIL = "support.sophia@ro.ru";

export const metadata: Metadata = {
  title: "Sophia — Большие вопросы. Маленькие уроки.",
  description: "Философия начинается с любопытства. Попробуй интерактивный вопрос и познакомься с идеей Sophia — платформы для самостоятельного мышления.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentAccount().catch(() => undefined);
  const viewer = user ? { id: user.id, displayName: user.displayName } : null;
  const chatEnabled = isAiChatEnabled();
  let chatAllowed = false;
  if (chatEnabled && user) {
    try { chatAllowed = canUseAiChat(user.id); } catch { /* A failed access lookup leaves the chat closed. */ }
  }
  return <html lang="ru">
    <body>
      <AccountViewer viewer={viewer}>
        <LessonProgressProvider accountId={user?.id ?? null} sessionUnavailable={user === undefined}>
          <PlatoChatProvider key={user?.id ?? "guest"} accountScope={user?.id} enabled={chatEnabled} allowed={chatAllowed}>
            <a className="skip-link" href="#main">Перейти к содержимому</a>
            {children}
          </PlatoChatProvider>
        </LessonProgressProvider>
      </AccountViewer>
      <footer className="site-footer">
        <div className="site-footer-inner container">
          <p>Возрастная маркировка — <strong>{siteAgeCategory}</strong></p>
          <p>Поддержка и обращения по персональным данным</p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          {Object.values(legalDocuments).map(({ href, title }) => <Link key={href} href={href}>{title}</Link>)}
        </div>
      </footer>
    </body>
  </html>;
}
