"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, MessageCircle, Send, Square, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONVERSATION_PHILOSOPHERS, PLATO_CONVERSATION_PROMPTS, type PhilosopherId } from "./philosophers";
import styles from "./philosopher-conversation.module.css";
import { usePlatoChat } from "./plato-chat-provider";
import { CHAT_LIMITS, CHAT_MEMORY_NOTICE } from "./chat-contract";

export function PhilosopherConversation({ variant = "outline" }: { variant?: "default" | "outline" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const wasSending = useRef(false);
  const titleId = useId(), descriptionId = useId(), composerHintId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<PhilosopherId>("plato");
  const chat = usePlatoChat();
  const selected = CONVERSATION_PHILOSOPHERS.find(profile => profile.id === selectedId)!;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedId === "plato" && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [isOpen, selectedId, chat.messages, chat.pending, chat.streamed]);

  useEffect(() => {
    if (wasSending.current && chat.pending === null && isOpen && selectedId === "plato" &&
      (document.activeElement === document.body || document.activeElement === dialog.current)) composer.current?.focus({ preventScroll: true });
    wasSending.current = chat.pending !== null;
  }, [chat.pending, isOpen, selectedId]);

  function openConversation() {
    setIsOpen(true);
  }

  function closeConversation() { dialog.current?.close(); }

  return <>
    <Button ref={trigger} type="button" variant={variant} size="sm" className={styles.trigger}
      aria-haspopup="dialog" aria-expanded={isOpen} onClick={openConversation}>
      <MessageCircle size={17} aria-hidden="true" />Разговор с философом
      {variant === "default" && <ArrowUpRight size={15} aria-hidden="true" />}
    </Button>
    {isOpen && createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
      data-testid="philosopher-conversation"
      onClose={() => { setIsOpen(false); trigger.current?.focus({ preventScroll: true }); }}
      onCancel={event => { event.preventDefault(); closeConversation(); }}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
        )).filter(element => element.getClientRects().length > 0);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeConversation();
      }}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Sophia · Пространство диалога</span>
          <h2 id={titleId}>Разговор с философом</h2>
          <p id={descriptionId}>Большие вопросы начинаются с простого разговора.</p>
        </div>
        <button type="button" className={styles.close} aria-label="Закрыть разговор" onClick={closeConversation}>
          <X size={21} aria-hidden="true" />
        </button>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Собеседники">
          <p className={styles.sidebarLabel}>Выберите собеседника</p>
          <div className={styles.profiles} role="group" aria-label="Выбор философа" tabIndex={0}>
            {CONVERSATION_PHILOSOPHERS.map(profile => <button key={profile.id} type="button"
              className={styles.profile} aria-pressed={selectedId === profile.id}
              onClick={() => setSelectedId(profile.id)}>
              <span className={styles.avatar}><Image src={profile.image} alt="" width={48} height={48} unoptimized /></span>
              <span><span className={styles.profileName}>{profile.name}</span><small>{profile.status}</small></span>
            </button>)}
          </div>
          <p className={styles.sidebarNote}>Не заучивать ответы.<br />Учиться задавать вопросы.</p>
          <details className={styles.credits}>
            <summary>Фотографии скульптур</summary>
            <ul>{CONVERSATION_PHILOSOPHERS.map(profile => <li key={profile.id}>
              <a href={profile.source} target="_blank" rel="noreferrer">{profile.name}</a>: {profile.photographer} / Wikimedia Commons.
              {profile.license === "CC BY 2.5" ? <> <a href="https://creativecommons.org/licenses/by/2.5/" target="_blank" rel="noreferrer">CC BY 2.5</a>.</> : " Public domain."}
              {" "}Показано в круглом кадре.
            </li>)}</ul>
          </details>
        </aside>
        <section className={styles.chat} aria-label={`Разговор: ${selected.name}`}>
          <header className={styles.chatHeader}>
            <span className={`${styles.avatar} ${styles.headerAvatar}`}><Image src={selected.image} alt="" width={44} height={44} unoptimized /></span>
            <div><h3>{selected.name}</h3><p>{selected.school}</p></div>
            <span className={styles.status}>{selected.status}</span>
          </header>
          {selected.draftAvailable && <div className={styles.chatToolbar}>
            <span>ИИ-собеседник · может ошибаться</span>
            <button type="button" disabled={chat.pending !== null} onClick={() => { chat.reset(); composer.current?.focus(); }}><RotateCcw size={12} aria-hidden="true" />Новый разговор</button>
          </div>}
          <div ref={history} className={styles.conversation} role="region" aria-label="Область разговора" tabIndex={0}>
            {selected.draftAvailable && (chat.messages.length > 0 || chat.pending !== null) ? <div className={styles.messages} role="log" aria-label="Переписка с Платоном" aria-live="polite" aria-relevant="additions text">
              {chat.trimmed && <p className={styles.historyNotice}>Показана последняя часть переписки.</p>}
              {chat.messages.map(message => <div key={message.id} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
                <span className={styles.messageAuthor}>{message.role === "user" ? "Вы" : message.outcome === "safety" ? "Sophia" : "Платон · ИИ"}</span>
                <p>{message.content}</p>
              </div>)}
              {chat.pending !== null && <><div className={`${styles.message} ${styles.userMessage}`}><span className={styles.messageAuthor}>Вы</span><p>{chat.pending}</p></div>{chat.streamed ? <div className={styles.message}><span className={styles.messageAuthor}>Платон · ИИ</span><p>{chat.streamed}</p></div> : <p className={styles.waiting} role="status">Платон размышляет…</p>}</>}
            </div> : <div className={styles.empty} key={selected.id}>
              <div className={styles.portrait}><Image src={selected.image} alt={`Скульптурный портрет: ${selected.name}`} width={126} height={126} unoptimized /></div>
              <span className={styles.eyebrow}>Место для ваших вопросов</span>
              <h4>{selected.draftAvailable ? "О чём вы хотели бы спросить Платона?" : "Этот разговор ещё впереди"}</h4>
              <p>{selected.draftAvailable
                ? "О добродетели, знании или справедливости — иногда один вопрос открывает целый мир."
                : `Разговор с философом «${selected.name}» появится позже. Пока можно поговорить с Платоном.`}</p>
              {selected.draftAvailable && <div className={styles.prompts} aria-label="Идеи для вопроса">
                {PLATO_CONVERSATION_PROMPTS.map(prompt => <button key={prompt} type="button" onClick={() => {
                  chat.setDraft(prompt); composer.current?.focus({ preventScroll: true });
                }}>{prompt}<ArrowUpRight size={13} aria-hidden="true" /></button>)}
              </div>}
            </div>}
          </div>
          <form className={styles.composer} onSubmit={event => { event.preventDefault(); if (selected.draftAvailable) void chat.send(); }}>
            <label htmlFor={`${titleId}-message`}>Ваш вопрос</label>
            <div className={styles.inputRow}>
              <textarea ref={composer} id={`${titleId}-message`} aria-label="Сообщение" aria-describedby={composerHintId}
                placeholder={selected.draftAvailable ? "Напишите, что вам интересно…" : "Этот собеседник пока недоступен"}
                value={selected.draftAvailable ? chat.draft : ""} disabled={!selected.draftAvailable || chat.pending !== null} maxLength={CHAT_LIMITS.messageChars}
                onChange={event => chat.setDraft(event.target.value)} rows={2}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && selected.draftAvailable) { event.preventDefault(); void chat.send(); }
                }} />
              {chat.pending !== null && selected.draftAvailable ? <button key="stop" type="button" className={styles.send} aria-label="Остановить ответ" onClick={event => { event.preventDefault(); chat.stop(); }}><Square size={17} aria-hidden="true" /></button> :
                <button key="send" type="submit" className={styles.send} aria-label="Отправить сообщение" disabled={!selected.draftAvailable || !chat.draft.trim()}><Send size={18} aria-hidden="true" /></button>}
            </div>
            {chat.error && selected.draftAvailable && <p className={styles.chatError} role="alert">{chat.error}</p>}
            <p id={composerHintId} className={styles.composerHint}>{selected.draftAvailable ? CHAT_MEMORY_NOTICE : "Этот собеседник пока недоступен. Выберите Платона."}</p>
          </form>
        </section>
      </div>
    </dialog>, document.body)}
  </>;
}
