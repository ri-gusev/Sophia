import type { ReaderParagraph } from "./reader-types";
import { paragraphText, quoteSlices, quoteText, type QuoteBounds } from "./reader-quotes";

export function textPoint(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const size = node.textContent?.length ?? 0;
    if (offset <= size) return { node, offset };
    offset -= size;
  }
  return { node: root, offset: root.childNodes.length };
}

export function textRange(root: HTMLElement, start: number, end: number) {
  const range = document.createRange();
  const from = textPoint(root, start);
  const to = textPoint(root, end);
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

export function lineOffset(root: HTMLElement, y: number) {
  let start = 0;
  let end = Math.max(0, (root.textContent?.length ?? 0) - 1);
  while (start < end) {
    const mid = Math.floor((start + end) / 2);
    const box = textRange(root, mid, mid + 1).getBoundingClientRect();
    if (box.bottom > y) end = mid;
    else start = mid + 1;
  }
  return start;
}

export function paragraphElement(root: HTMLElement, id: string) {
  return root.querySelector<HTMLElement>(`[data-paragraph="${CSS.escape(id)}"]`);
}

export function quoteRanges(root: HTMLElement, paragraphs: ReaderParagraph[], bounds: QuoteBounds) {
  return quoteSlices(paragraphs, bounds)?.flatMap(slice => {
    const element = paragraphElement(root, slice.id)?.querySelector<HTMLElement>("[data-reader-text]");
    return element && slice.start < slice.end ? [textRange(element, slice.start, slice.end)] : [];
  }) ?? [];
}

export function selectedText(root: HTMLElement, paragraphs: ReaderParagraph[], selection: Selection | null) {
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  function localOffset(span: HTMLElement, node: Node, offset: number, fallback: number) {
    if (!span.contains(node)) return fallback;
    const before = document.createRange();
    before.setStart(span, 0);
    before.setEnd(node, offset);
    return before.toString().length;
  }

  const spans = root.querySelectorAll<HTMLElement>("[data-reader-text]");
  const parts = [...spans].flatMap((span, index) => {
    if (!range.intersectsNode(span)) return [];
    const paragraph = paragraphs[index];
    if (!paragraph) return [];
    const start = localOffset(span, range.startContainer, range.startOffset, 0);
    const end = localOffset(span, range.endContainer, range.endOffset, paragraphText(paragraph).length);
    return start < end ? [{ id: paragraph.id, start, end }] : [];
  });
  const first = parts[0];
  const last = parts.at(-1);
  if (!first || !last) return null;
  const bounds = { startParagraphId: first.id, endParagraphId: last.id, startOffset: first.start, endOffset: last.end };
  const text = quoteText(paragraphs, bounds);
  if (!text?.trim()) return null;
  return { ...bounds, text };
}
