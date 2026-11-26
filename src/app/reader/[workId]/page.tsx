import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/features/reader/reader";
import { findReaderWork } from "@/features/reader/reader-catalog";

interface ReaderPageProps {
  params: Promise<{ workId: string }>;
}

export async function generateMetadata({ params }: ReaderPageProps): Promise<Metadata> {
  const work = findReaderWork((await params).workId);
  if (!work?.sections.length) notFound();
  return { title: work.title + " — Читалка Sophia", description: work.description };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const work = findReaderWork((await params).workId);
  if (!work?.sections.length) notFound();
  return <Reader key={work.id} work={work} />;
}
