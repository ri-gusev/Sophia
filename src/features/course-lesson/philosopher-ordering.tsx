"use client";

import Image from "next/image";
import { useId, useRef, useState, type PointerEvent } from "react";
import { reorderItem, type ExerciseAnswer, type ExerciseScene } from "./lesson-state";
import styles from "./philosopher-ordering.module.css";

type Drag = { id: string; pointerId: number; startX: number; startY: number; x: number; y: number; target: number };

export function PhilosopherOrdering({ scene, answer, solved, onChange }: {
  scene: ExerciseScene;
  answer: ExerciseAnswer;
  solved: boolean;
  onChange: (answer: ExerciseAnswer) => void;
}) {
  const instructions = useId();
  const board = useRef<HTMLOListElement>(null);
  const gesture = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function place(id: string, target: number) {
    if (solved) return;
    const from = answer.order.indexOf(id);
    const order = reorderItem(answer.order, from, target);
    if (order !== answer.order) {
      onChange({ ...answer, order, checked: false });
      const name = scene.options.find(option => option.id === id)?.text;
      setAnnouncement(`${name} — место ${target + 1} из ${answer.order.length}.`);
    }
    setSelected(null);
  }

  function start(event: PointerEvent<HTMLButtonElement>, id: string, index: number) {
    if (solved || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: 0, y: 0, target: index };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const x = event.clientX - current.startX;
    const y = event.clientY - current.startY;
    if (Math.hypot(x, y) < 6 && !suppressClick.current) return;
    suppressClick.current = true;
    const slots = Array.from(board.current?.children ?? []);
    const target = slots.findIndex(slot => {
      const bounds = slot.getBoundingClientRect();
      return event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    });
    const next = { ...current, x, y, target };
    gesture.current = next;
    setDrag(next);
  }

  function end(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDrag(null);
    if (cancel) suppressClick.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancel && suppressClick.current && current.target >= 0) place(current.id, current.target);
  }

  return <div className={styles.game}>
    <p id={instructions} className={styles.instructions}>Расположите фигуры слева направо: учитель → ученик. Перетащите фигуру или выберите её и нажмите на другую фигуру. На клавиатуре используйте стрелки ← →.</p>
    <ol ref={board} className={styles.board} aria-label="Порядок философов">
      {answer.order.map((id, index) => {
        const option = scene.options.find(item => item.id === id)!;
        const moving = drag?.id === id;
        return <li key={id} className={styles.slot} data-order-slot={index} data-target={drag?.target === index}>
          <button type="button" className={styles.figure} aria-label={`${option.text}: переместить`} aria-describedby={instructions}
            aria-pressed={selected === id} disabled={solved} data-dragging={moving}
            style={moving ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}
            onPointerDown={event => start(event, id, index)} onPointerMove={move} onPointerUp={event => end(event)}
            onPointerCancel={event => end(event, true)} onLostPointerCapture={event => end(event, true)}
            onClick={() => {
              if (suppressClick.current) { suppressClick.current = false; return; }
              if (selected && selected !== id) place(selected, index);
              else setSelected(selected === id ? null : id);
            }}
            onKeyDown={event => {
              if (event.key === "Escape") { setSelected(null); return; }
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              place(id, index + (event.key === "ArrowLeft" ? -1 : 1));
            }}>
            {option.image && <Image src={option.image} alt="" width={667} height={1000} sizes="(max-width: 760px) 30vw, 210px" draggable={false} className={styles.image} />}
            <span data-testid="ordering-item-name" className={styles.name}>{option.text}</span>
          </button>
          <span className={styles.place} aria-label={`Место ${index + 1}`}>{index + 1}</span>
        </li>;
      })}
    </ol>
    <p role="status" className={styles.announcement}>{announcement}</p>
  </div>;
}
