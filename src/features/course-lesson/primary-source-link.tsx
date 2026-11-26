import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readerHref, type ReaderLesson } from "@/features/reader/reader-types";
import type { PrimarySource } from "./primary-source-data";
import styles from "./primary-source-link.module.css";

export function PrimarySourceLink({ source, lesson }: { source: PrimarySource; lesson: ReaderLesson }) {
  const target = "workId" in source ? readerHref(source.workId, source.start, lesson) : source.url;
  return <aside className={styles.source} aria-label={`Первоисточник — ${source.title}, ${source.range}`}>
    <BookOpen className={styles.icon} size={18} aria-hidden="true" />
    <div><p>{source.author} · {source.title} · {source.range}</p><small>{source.context}</small></div>
    <Button asChild size="sm" variant="outline">
      <Link prefetch={false} href={target} target={"url" in source ? "_blank" : undefined}
        rel={"url" in source ? "noreferrer" : undefined}>Читать первоисточник <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </Button>
  </aside>;
}
