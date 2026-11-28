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
  editionVersion?: string;
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

export type ReaderLesson = { lessonId: string; sceneId: string };
export type ReaderSavedTarget = { kind: "quote" | "bookmark"; id: string };

export function readerEdition(work: ReaderWork) {
  return `${work.id}-${work.publicationYear}-${work.editionVersion ?? "1"}`;
}

export function readerHref(workId: string, reference?: string, lesson?: ReaderLesson) {
  const query = lesson ? "?" + new URLSearchParams({ lesson: lesson.lessonId, scene: lesson.sceneId }) : "";
  return "/reader/" + encodeURIComponent(workId) + query +
    (reference ? "#" + encodeURIComponent(reference) : "");
}

export function readerSavedHref(workId: string, kind: ReaderSavedTarget["kind"], id: string) {
  return readerHref(workId) + "#saved-" + kind + "=" + encodeURIComponent(id);
}
