"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  function closeMenu() { setIsOpen(false); }

  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === "Escape" && isOpen) { closeMenu(); toggleRef.current?.focus(); }
    }}>
      <div className="header-inner container">
        <Link className="wordmark" href="/" aria-label="Sophia — на главную">sophia<span>.</span></Link>
        <button className="menu-toggle" ref={toggleRef} type="button" aria-label={isOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={isOpen} aria-controls="main-navigation" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav id="main-navigation" aria-label="Основная навигация" className={`main-nav ${isOpen ? "is-open" : ""}`}>
          <Link href="/#how-it-works" onClick={closeMenu}>Как это работает</Link>
          <Link href="/learn" onClick={closeMenu}>Обучение</Link>
          <Link href="/atlas" onClick={closeMenu}>Атлас</Link>
          <span className="login-wrap"><button disabled type="button" aria-describedby="login-note">Войти</button><span id="login-note">Скоро</span></span>
          <Button asChild size="sm"><Link href="/learn" onClick={closeMenu}>Начать бесплатно <ArrowUpRight size={16} aria-hidden="true" /></Link></Button>
        </nav>
      </div>
    </header>
  );
}
