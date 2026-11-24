import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { PlatoChatProvider } from "@/features/philosopher-conversation/plato-chat-provider";
import { AccountViewer } from "@/features/account/account-viewer";
import { LessonProgressProvider } from "@/features/account/progress/client/lesson-progress-provider";
import { canUseAiChat } from "@/features/account/server/session";
import { currentAccount } from "@/features/account/server/viewer";

export const metadata: Metadata = {
  title: "Sophia — Большие вопросы. Маленькие уроки.",
  description: "Философия начинается с любопытства. Попробуй интерактивный вопрос и познакомься с идеей Sophia — платформы для самостоятельного мышления.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentAccount().catch(() => undefined);
  const viewer = user ? { id: user.id, displayName: user.displayName } : null;
  let chatAllowed = false;
  if (user) {
    try { chatAllowed = canUseAiChat(user.id); } catch { /* A failed access lookup leaves the chat closed. */ }
  }
  return <html lang="ru">
    <body>
      <AccountViewer viewer={viewer}>
        <LessonProgressProvider accountId={user?.id ?? null} sessionUnavailable={user === undefined}>
          <PlatoChatProvider key={user?.id ?? "guest"} accountScope={user?.id} allowed={chatAllowed}>
            <a className="skip-link" href="#main">Перейти к содержимому</a>
            {children}
          </PlatoChatProvider>
        </LessonProgressProvider>
      </AccountViewer>
    </body>
  </html>;
}
