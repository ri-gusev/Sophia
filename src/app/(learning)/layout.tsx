import type { ReactNode } from "react";
import Link from "next/link";

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="header-inner container">
          <Link className="wordmark" href="/" aria-label="Sophia — на главную">sophia<span>.</span></Link>
          <nav className="learning-nav" aria-label="Навигация курса">
            <Link href="/#how-it-works">Как это работает</Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
