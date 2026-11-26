export interface ReaderSection {
  id: string;
  title: string;
  stephanusReference?: string;
  characters: number;
}

export interface ReaderWork {
  id: string;
  title: string;
  author: string;
  translator: string;
  description: string;
  epoch: string;
  cover: string;
  sourceUrl: string;
  publicationYear: number;
  edition: string;
  rightsStatus: string;
  rightsJustification: string;
  sections: ReaderSection[];
  anchors?: Record<string, string | undefined>;
  unavailableReason?: string;
}

export interface ReaderParagraph {
  id: string;
  text: string;
  stephanusReference?: string;
  speaker?: string;
  continuation?: boolean;
}

export function readerHref(workId: string, reference?: string) {
  return "/reader/" + encodeURIComponent(workId) +
    (reference ? "#" + encodeURIComponent(reference) : "");
}
