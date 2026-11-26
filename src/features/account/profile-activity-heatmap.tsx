"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import { buildProfileActivityCalendar } from "./profile-activity-calendar";
import styles from "./profile-activity-heatmap.module.css";

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const intensityLevels = [0, 1, 2, 3, 4];
const dayOffsets: Readonly<Partial<Record<string, number>>> = {
  ArrowUp: -1,
  ArrowDown: 1,
  ArrowLeft: -7,
  ArrowRight: 7,
};

type ActivityDay = ReturnType<typeof buildProfileActivityCalendar>["days"][number];
type ActivityTip = {
  anchor: HTMLButtonElement;
  date: string;
  mode: "hover" | "focus" | "pinned";
};

function activityDescription(count: number) {
  return count ? `Пройдено уроков: ${count}` : "Нет завершённых уроков";
}

function ActivityTooltip({
  id,
  anchor,
  day,
  scrollArea,
  cancelClose,
  scheduleClose,
}: {
  id: string;
  anchor: HTMLButtonElement;
  day: ActivityDay;
  scrollArea: RefObject<HTMLDivElement | null>;
  cancelClose: () => void;
  scheduleClose: () => void;
}) {
  const tooltip = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const popup = tooltip.current;
    if (!popup) return;
    const viewport = window.visualViewport;
    function placeTooltip(element: HTMLDivElement) {
      const anchorBounds = anchor.getBoundingClientRect();
      const scrollBounds = scrollArea.current?.getBoundingClientRect();
      const margin = 8;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const right = left + (viewport?.width ?? document.documentElement.clientWidth);
      const bottom = top + (viewport?.height ?? document.documentElement.clientHeight);
      element.hidden = !anchor.isConnected
        || anchorBounds.bottom <= top || anchorBounds.top >= bottom
        || anchorBounds.right <= Math.max(left, scrollBounds?.left ?? left)
        || anchorBounds.left >= Math.min(right, scrollBounds?.right ?? right);
      if (element.hidden) return;

      element.style.maxWidth = `${right - left - 2 * margin}px`;
      const { width, height } = element.getBoundingClientRect();
      const centered = anchorBounds.left + (anchorBounds.width - width) / 2;
      const above = anchorBounds.top - height - margin;
      const below = anchorBounds.bottom + margin;
      element.style.left = `${Math.max(left + margin, Math.min(centered, right - width - margin))}px`;
      element.style.top = `${Math.max(top + margin, Math.min(
        above >= top + margin ? above : below,
        bottom - height - margin,
      ))}px`;
    }

    const update = () => placeTooltip(popup);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [anchor, day, scrollArea]);

  return createPortal(
    <div
      ref={tooltip}
      id={id}
      role="tooltip"
      className={styles.tooltip}
      onPointerEnter={cancelClose}
      onPointerLeave={scheduleClose}
    >
      <time dateTime={day.date}>{day.label}</time>
      <span>{activityDescription(day.count)}</span>
    </div>,
    document.body,
  );
}

export function ProfileActivityHeatmap({
  today,
  activity,
}: {
  today: string;
  activity: Readonly<Record<string, number>>;
}) {
  const { days, months, weeks } = useMemo(() => buildProfileActivityCalendar(today, activity), [today, activity]);
  const headingId = useId();
  const instructionsId = useId();
  const tipId = useId();
  const scrollArea = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const [tip, setTip] = useState<ActivityTip | null>(null);
  const tabDate = focusedDate && focusedDate >= days[0].date && focusedDate <= today ? focusedDate : today;
  const tooltipDay = tip && days.find(day => day.date === tip.date);

  useEffect(() => {
    if (!tooltipDay) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Element
        && !scrollArea.current?.contains(event.target)
        && !document.getElementById(tipId)?.contains(event.target)) {
        setTip(null);
      }
    }
    function dismissOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setTip(null);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [tipId, tooltipDay]);

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }, []);

  function cancelClose() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setTip(current => current?.mode === "hover" ? null : current);
    }, 160);
  }

  function showTip(anchor: HTMLButtonElement, date: string, mode: ActivityTip["mode"]) {
    cancelClose();
    setTip(current => {
      if (current?.anchor === anchor && mode === "hover") return current;
      if (current?.anchor === anchor && current.mode === "pinned" && mode === "pinned") return null;
      return { anchor, date, mode };
    });
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offset = dayOffsets[event.key];
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = days.length - 1;
    else if (offset !== undefined) next = index + offset;
    else return;
    event.preventDefault();

    const day = days[next];
    if (!day) return;
    const cell = scrollArea.current?.querySelector<HTMLButtonElement>(`[data-date="${day.date}"]`);
    if (!cell) return;
    cell.focus({ preventScroll: true });
    cell.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }

  return (
    <section className={`glass ${styles.section}`} aria-labelledby={headingId}>
      <h2 id={headingId}>Активность обучения</h2>
      <p id={instructionsId} className={styles.visuallyHidden}>
        Календарь за последние 365 дней. Стрелки перемещают фокус по дням и неделям.
        Home и End переходят к первой и последней дате. Escape закрывает подсказку.
      </p>
      <div className={styles.board} style={{ "--activity-weeks": weeks } as CSSProperties}>
        <div className={styles.weekdays} aria-hidden="true">
          {weekdayLabels.map(label => <span key={label}>{label}</span>)}
        </div>
        <div className={styles.scrollArea} ref={scrollArea} data-activity-scroll="">
          <div className={styles.calendar} role="group" aria-describedby={instructionsId} aria-label="Дни активности">
            {months.map((month, index) => {
              const following = months[index + 1];
              const start = following ? month.week : Math.min(month.week, weeks - 2);
              return (
                <span
                  key={month.date}
                  className={styles.month}
                  style={{ gridColumn: `${start} / ${following?.week ?? -1}` }}
                  data-at-edge={start !== month.week || undefined}
                  aria-hidden="true"
                >
                  {month.label}
                </span>
              );
            })}
            {days.map((day, index) => (
              <button
                key={day.date}
                type="button"
                className={styles.cell}
                style={{ gridColumn: day.week, gridRow: day.weekday + 1 }}
                data-date={day.date}
                data-level={day.level}
                data-active={tip?.date === day.date || undefined}
                aria-label={`${day.label}, ${activityDescription(day.count)}`}
                aria-current={day.date === today ? "date" : undefined}
                tabIndex={day.date === tabDate ? 0 : -1}
                onFocus={event => {
                  setFocusedDate(day.date);
                  if (event.currentTarget.matches(":focus-visible")) showTip(event.currentTarget, day.date, "focus");
                }}
                onBlur={() => setTip(current => (
                  current?.date === day.date && current.mode === "focus" ? null : current
                ))}
                onKeyDown={event => moveFocus(event, index)}
                onPointerEnter={event => {
                  if (event.pointerType !== "touch") showTip(event.currentTarget, day.date, "hover");
                }}
                onPointerLeave={event => {
                  if (event.pointerType !== "touch") scheduleClose();
                }}
                onClick={event => showTip(event.currentTarget, day.date, event.detail === 0 ? "focus" : "pinned")}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className={styles.legend}
        role="img"
        aria-label="Интенсивность активности от меньшей к большей, от нуля до четырёх и более уроков"
      >
        <span aria-hidden="true">Меньше</span>
        {intensityLevels.map(level => (
          <span key={level} className={styles.swatch} data-level={level} aria-hidden="true" />
        ))}
        <span aria-hidden="true">Больше</span>
      </div>
      {tip && tooltipDay && (
        <ActivityTooltip
          id={tipId}
          anchor={tip.anchor}
          day={tooltipDay}
          scrollArea={scrollArea}
          cancelClose={cancelClose}
          scheduleClose={scheduleClose}
        />
      )}
    </section>
  );
}
