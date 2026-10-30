import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseMap } from "@/features/course-map/course-map";
import styles from "@/features/course-map/course-map.module.css";

export const metadata: Metadata = {
  title: "Основной курс философии — Sophia",
  description: "Путешествие по пяти эпохам философии. Исследуйте карту тем от Античности до современности.",
};

export default function LearnPage() {
  return (
    <main id="main" className={styles.page}>
      <div className={`container ${styles.pageHeading}`}>
        <div><h1 className={styles.pageTitle}>Основной курс философии</h1><p>Пять эпох. Двадцать пять шагов к большим вопросам.</p></div>
        <Button className={styles.returnLink} asChild variant="outline" size="sm"><Link href="/"><ArrowLeft size={16} aria-hidden="true" />Вернуться на главную</Link></Button>
      </div>
      <CourseMap />
    </main>
  );
}
