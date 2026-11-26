import type { ReaderQuoteInput } from "./reader-quote-types";
import type { ReaderParagraph } from "./reader-types";

export type QuoteBounds = Pick<ReaderQuoteInput, "startParagraphId" | "endParagraphId" | "startOffset" | "endOffset">;
const paragraphBreak = "\n\n";

export function paragraphText(paragraph: ReaderParagraph) {
  return paragraph.speaker ? paragraph.speaker + " " + paragraph.text : paragraph.text;
}

export function precedingReference(paragraphs: ReaderParagraph[], paragraphId: string, fallback = "") {
  let reference = fallback;
  for (const paragraph of paragraphs) {
    reference = paragraph.stephanusReference ?? reference;
    if (paragraph.id === paragraphId) return reference;
  }
  return fallback;
}

export function quoteSlices(paragraphs: ReaderParagraph[], bounds: QuoteBounds) {
  const start = paragraphs.findIndex(paragraph => paragraph.id === bounds.startParagraphId);
  const end = paragraphs.findIndex(paragraph => paragraph.id === bounds.endParagraphId);
  if (start < 0 || end < start) return null;
  const slices = paragraphs.slice(start, end + 1).map((paragraph, index) => {
    const text = paragraphText(paragraph);
    return {
      id: paragraph.id, text,
      start: index === 0 ? bounds.startOffset : 0,
      end: index === end - start ? bounds.endOffset : text.length,
    };
  });
  return slices.every(slice => Number.isInteger(slice.start) && Number.isInteger(slice.end) &&
    slice.start >= 0 && slice.end >= slice.start && slice.end <= slice.text.length) ? slices : null;
}

export function quoteText(paragraphs: ReaderParagraph[], bounds: QuoteBounds) {
  return quoteSlices(paragraphs, bounds)?.map(slice => slice.text.slice(slice.start, slice.end)).join(paragraphBreak);
}

export function resolveQuote(
  paragraphs: ReaderParagraph[],
  quote: QuoteBounds & Pick<ReaderQuoteInput, "edition" | "text">,
  edition: string,
): QuoteBounds | null {
  if (!quote.text.trim()) return null;
  const bounds = {
    startParagraphId: quote.startParagraphId, endParagraphId: quote.endParagraphId,
    startOffset: quote.startOffset, endOffset: quote.endOffset,
  };
  if (quote.edition === edition && quoteText(paragraphs, bounds) === quote.text) return bounds;
  const texts = paragraphs.map(paragraphText);
  const fullText = texts.join(paragraphBreak);
  const offset = fullText.indexOf(quote.text);
  if (offset < 0 || fullText.indexOf(quote.text, offset + 1) >= 0) return null;
  function pinpoint(target: number) {
    for (const [index, text] of texts.entries()) {
      if (target <= text.length) return target >= 0 ? { id: paragraphs[index].id, offset: target } : undefined;
      target -= text.length + paragraphBreak.length;
    }
  }
  const start = pinpoint(offset);
  const end = pinpoint(offset + quote.text.length);
  if (!start || !end) return null;
  return { startParagraphId: start.id, endParagraphId: end.id, startOffset: start.offset, endOffset: end.offset };
}
