"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen, ChevronDown, Globe, Layers, Menu, MessagesSquare, Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountNavigation } from "@/features/account/account-navigation";
import styles from "./header.module.css";

const learningLinks = [
  { href: "/learn", title: "Основной курс", description: "Философия от Античности до наших дней", icon: Route },
  { href: "/courses", title: "Тематические курсы", description: "Отдельные направления и традиции", icon: Layers },
  { href: "/atlas", title: "Философский атлас", description: "Мыслители на карте и шкале времени", icon: Globe },
  { href: "/library", title: "Библиотека", description: "Философские первоисточники и читалка", icon: BookOpen },
  { href: "/chat", title: "Диалоги с философами", description: "Разговор с Платоном", icon: MessagesSquare },
] as const;

export function Header() {
  const pathname = usePathname();
  const learningId = useId();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLearningOpen, setIsLearningOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const learningRef = useRef<HTMLDivElement>(null);
  const learningToggleRef = useRef<HTMLButtonElement>(null);
  const activeLearningLink = learningLinks.find(({ href }) => pathname === href || pathname.startsWith(href + "/"));

  function closeNavigation() {
    setIsMobileOpen(false);
    setIsLearningOpen(false);
  }

  function selectLearningLink() {
    const mobileToggle = mobileToggleRef.current;
    const returnTarget = mobileToggle?.getClientRects().length ? mobileToggle : learningToggleRef.current;
    returnTarget?.focus({ preventScroll: true });
    closeNavigation();
  }

  useEffect(() => {
    if (!isMobileOpen && !isLearningOpen) return;

    function dismissOutside(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (!learningRef.current?.contains(event.target)) setIsLearningOpen(false);
      if (!headerRef.current?.contains(event.target)) setIsMobileOpen(false);
    }

    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [isMobileOpen, isLearningOpen]);

  return (
    <header
      className="site-header"
      ref={headerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeNavigation();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (isLearningOpen) {
          event.preventDefault();
          setIsLearningOpen(false);
          learningToggleRef.current?.focus();
        } else if (isMobileOpen) {
          event.preventDefault();
          closeNavigation();
          mobileToggleRef.current?.focus();
        }
      }}
    >
      <div className="header-inner container">
        <Link className="wordmark" href="/" aria-label="София — на главную" onClick={closeNavigation}>софия<span>.</span></Link>
        <button
          className="menu-toggle"
          ref={mobileToggleRef}
          type="button"
          aria-label={isMobileOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isMobileOpen}
          aria-controls="main-navigation"
          onClick={() => isMobileOpen ? closeNavigation() : setIsMobileOpen(true)}
        >
          {isMobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav id="main-navigation" aria-label="Основная навигация" className={`main-nav ${isMobileOpen ? "is-open" : ""}`}>
          <Link href="/#how-it-works" onClick={closeNavigation}>Как это работает</Link>
          <div
            className={styles.learningGroup}
            ref={learningRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsLearningOpen(false);
            }}
          >
            <button
              className={styles.trigger}
              ref={learningToggleRef}
              type="button"
              aria-expanded={isLearningOpen}
              aria-controls={learningId}
              data-active={activeLearningLink ? "" : undefined}
              onClick={() => setIsLearningOpen(!isLearningOpen)}
            >
              Обучение <ChevronDown className={styles.chevron} size={15} aria-hidden="true" />
            </button>
            <div className={styles.panel} id={learningId} data-open={isLearningOpen ? "" : undefined} inert={!isLearningOpen}>
              <ul className={styles.list} role="list">
                {learningLinks.map(({ href, title, description, icon: Icon }, index) => {
                  const descriptionId = `${learningId}-description-${index}`;
                  return (
                    <li className={styles.learningRow} key={href}>
                      <span className={styles.icon}><Icon size={19} aria-hidden="true" /></span>
                      <span className={styles.linkText}>
                        <Link
                          className={styles.learningLink}
                          href={href}
                          prefetch={isLearningOpen && href !== "/library" ? undefined : false}
                          aria-current={pathname === href ? "page" : activeLearningLink?.href === href ? "location" : undefined}
                          aria-describedby={descriptionId}
                          onClick={selectLearningLink}
                        >
                          {title}
                        </Link>
                        <span id={descriptionId} className={styles.description}>{description}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <AccountNavigation onNavigate={closeNavigation} />
          <Button asChild size="sm"><Link href="/learn" onClick={closeNavigation}>Начать бесплатно <ArrowUpRight size={16} aria-hidden="true" /></Link></Button>
        </nav>
      </div>
    </header>
  );
}
