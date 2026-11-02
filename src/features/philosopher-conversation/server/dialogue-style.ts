import type { ChatMessage } from "../chat-contract.ts";
import type { Draft } from "./structured.ts";

export const DIALOGUE_CODES = ["role_break", "academic_metalanguage", "excessive_disclaimer", "assistant_cliche", "missing_inquiry", "moralizing", "unsupported_personal_memory", "repeated_question", "mechanical_mirroring"] as const;
const normalize = (text: string) => text.toLowerCase().replaceAll("ё", "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const questions = (text: string) => (text.match(/[^.!?\n]+\?/g) ?? []).map(normalize);

/** Only server-selected enums/numbers enter developer instructions, never user/source text. */
export function generationPolicy(mode: "greeting" | "disagreement" | "modern_unknown" | "explanation" | "inquiry", verifiedSources: number[]): string {
  const turn = {
    greeting: "Поздоровайся просто и коротко. Не описывай факт приветствия и не начинай лекцию.",
    disagreement: "Продолжи предыдущую мысль: выясни, с каким доводом собеседник не согласен. Не пересказывай тему заново и не объявляй его неправым.",
    modern_unknown: "Начни совместное философское исследование, а не упирайся в незнание. Если название состоит из понятных слов, разбери их средствами своей эпохи: искусственное как созданное мастерством, интеллект как разум/понимание. Можно предложить условную гипотезу и различить разум, знание и подражание. Не утверждай, как устроена реальная современная технология и что она умеет. Даже общие возможности (усиливать память, ускорять счёт, подбирать ответы) нельзя выводить из названия. Оставайся на уровне критерия разума и мысленного эксперимента; не выдавай гипотезу за определение пользователя. Ответ до 1200 символов, 1–2 небольших абзаца, обычно один содержательный вопрос. Только если имя/слово не даёт опоры для рассуждения, коротко попроси объяснить его; не выдумывай взгляды неизвестного мыслителя. Claims=[] либо reconstruction, без factual attribution.",
    explanation: "Сначала прямо объясни запрошенное понятие своими словами от первого лица. Один понятный пример/различение, без исторических приписываний и академических оговорок. Не предлагай меню дальнейших услуг. Вопрос необязателен.",
    inquiry: "Исследуй текущий тезис: выбери ОДНО неясное понятие или следствие, кратко предложи различение/контрпример и обычно один содержательный вопрос. Не делай вывод за собеседника до его ответа; не объявляй, что польза заведомо оправдывает или не оправдывает вред. После вопроса дай ему место ответить, не продолжай завершённой лекцией. Не повторяй ранее отвеченный вопрос.",
  }[mode];
  return `Правила текущего хода (доверенная серверная политика). ${turn}\n${verifiedSources.length
    ? `Подтверждённые evidence доступны только под номерами ${verifiedSources.join(", ")}. Для fact/position/quote копируй evidence.quote дословно короткой подстрокой соответствующего source.text. Не перефразируй evidence. Остальное текущее рассуждение — reconstruction.`
    : "Для этого хода нет verified evidence: не утверждай биографических событий, цитат и документальной атрибуции. Claims=[] либо reconstruction с evidence=[]. Обычное понятное философское объяснение/довод допустимы без исторической атрибуции и без слов о реконструкции."}`;
}

/** Deterministic style boundaries supplement, rather than replace, semantic evaluation. */
export function dialogueViolations(draft: Draft, recent: ChatMessage[] = [], userMessage = ""): string[] {
  const message = draft.message, issues: string[] = [];
  const identityQuestion = /(?:ты\s+(?:сам\s+)?(?:ии\b|бот|chatgpt|настоящий\s+платон|языковая\s+модель)|кто\s+ты\s+(?:на\s+самом\s+деле|такой))/iu.test(userMessage);
  if (!identityQuestion && /(?:как\s+(?:языковая\s+модель|ии)|я\s+(?:языковая\s+модель|chatgpt)|я.{0,15}(?:историческая|учебная)\s+реконструкция)/iu.test(message)) issues.push("role_break");
  if (/(?:в\s+платоновском\s+контексте|согласно\s+философии\s+платона|с\s+точки\s+зрения\s+платона|в\s+исторических\s+источниках\s+говорится)/iu.test(message)) issues.push("academic_metalanguage");
  if (/(?:имеешь\s+в\s+виду\s+историческ|как\s+(?:историческ|персонаж[а-я]*\s+диалога))/iu.test(message)) issues.push("academic_metalanguage");
  if (/(?:биографическ.{0,30}истин|документальн.{0,30}(?:подтвержд|атрибуц)|историческ.{0,20}атрибуц|без\s+риска\s+приписать\s+прошлому|в\s+(?:загруженном\s+)?корпусе)/iu.test(message)) issues.push("excessive_disclaimer");
  if (/(?:если\s+(?:ты\s+)?хочешь.{0,50}(?:могу|расскаж)|хочешь.{0,35}(?:подробнее|расскажу)|я\s+могу\s+(?:помочь|рассказать|объяснить)|давай\s+рассмотрим\s+несколько\s+аспектов)/iu.test(message)) issues.push("assistant_cliche");
  if (/(?:ты\s+приветствуешь|я\s+откликаюсь\s+на\s+это|ты\s+выражаешь\s+несогласие)/iu.test(message)) issues.push("mechanical_mirroring");
  const personalMemory = /(?:[Яя]\s+(?:лично\s+)?(?:помню,?\s+как|встречал(?:ся)?|дружил|беседовал|разговаривал|присутствовал)|[Яя]\s+(?:лично\s+)?(?:знал|знаком\s+с)\s+[А-ЯЁ][а-яё]+|[Мм]ы\s+с\s+[А-ЯЁ][а-яё]+)/u.test(message);
  if (personalMemory && !draft.claims.some(claim => claim.kind === "fact" && claim.evidence.length)) issues.push("unsupported_personal_memory");
  if (!/повтори|напомни.{0,20}вопрос/iu.test(userMessage)) {
    const previous = new Set(recent.filter(item => item.role === "assistant").flatMap(item => questions(item.content)));
    if (questions(message).some(question => previous.has(question))) issues.push("repeated_question");
  }
  return [...new Set(issues)];
}
