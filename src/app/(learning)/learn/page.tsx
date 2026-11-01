import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseMap } from "@/features/course-map/course-map";
import { PhilosopherConversation } from "@/features/philosopher-conversation/philosopher-conversation";
import styles from "@/features/course-map/course-map.module.css";

export const metadata: Metadata = {
  title: "Основной курс философии — Sophia",
  description: "Путешествие по пяти эпохам философии. Исследуйте карту тем от Античности до современности.",
};

export default function LearnPage() {
  return (
    <main id="main" className={styles.page}>
      <div className={`container ${styles.pageHeading}`}>
        <div><h1 className={styles.pageTitle}>Основной курс философии</h1><p>Пять эпох. Путешествие к большим вопросам.</p></div>
        <div className={styles.headingActions}>
          <PhilosopherConversation />
          <Button className={styles.returnLink} asChild variant="outline" size="sm"><Link href="/"><ArrowLeft size={16} aria-hidden="true" />Вернуться на главную</Link></Button>
        </div>
      </div>
      <CourseMap />
    </main>
  );
}
