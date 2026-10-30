import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sophia — Большие вопросы. Маленькие уроки.",
  description: "Философия начинается с любопытства. Попробуй интерактивный вопрос и познакомься с идеей Sophia — платформы для самостоятельного мышления.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><a className="skip-link" href="#main">Перейти к содержимому</a>{children}</body></html>;
}
