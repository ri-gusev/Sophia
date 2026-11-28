import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/features/reader/reader";
import { findReaderWork } from "@/features/reader/reader-catalog";
import { INTRO_LESSONS } from "@/features/course-lesson/lesson-data";

interface ReaderPageProps {
  params: Promise<{ workId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: ReaderPageProps): Promise<Metadata> {
  const work = findReaderWork((await params).workId);
  if (!work?.sections.length) notFound();
  return { title: work.title + " — Читалка София", description: work.description };
}

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const work = findReaderWork((await params).workId);
  if (!work?.sections.length) notFound();
  const query = await searchParams;
  const lesson = Object.values(INTRO_LESSONS).find(item => item.id === query.lesson);
  const scene = lesson?.scenes.find(item => item.id === query.scene);
  const lessonReturn = lesson && scene
    ? "/learn#" + new URLSearchParams({ lesson: lesson.id, scene: scene.id }) : undefined;
  return <Reader key={work.id} work={work} lessonReturn={lessonReturn} />;
}
