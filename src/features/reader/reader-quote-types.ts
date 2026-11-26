export type ReaderQuoteInput = Readonly<{
  workId: string;
  sectionId: string;
  startParagraphId: string;
  endParagraphId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  reference: string;
  edition: string;
}>;

export type ReaderQuote = ReaderQuoteInput & Readonly<{
  id: string;
  createdAt: string;
}>;
