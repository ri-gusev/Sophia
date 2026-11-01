import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { PlatoChatProvider } from "@/features/philosopher-conversation/plato-chat-provider";

export const metadata: Metadata = {
  title: "Sophia — Большие вопросы. Маленькие уроки.",
  description: "Философия начинается с любопытства. Попробуй интерактивный вопрос и познакомься с идеей Sophia — платформы для самостоятельного мышления.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><PlatoChatProvider><a className="skip-link" href="#main">Перейти к содержимому</a>{children}</PlatoChatProvider></body></html>;
}
