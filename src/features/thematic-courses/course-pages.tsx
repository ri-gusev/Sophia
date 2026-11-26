import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThematicCourse } from "./catalog";
import styles from "./course-pages.module.css";

export const COURSES_DESCRIPTION = "Исследуй философию за пределами основного курса. Выбирай темы, которые интересуют именно тебя";

const CARD_SIZES = "(max-width: 720px) calc(100vw - 40px), (max-width: 800px) calc(50vw - 30px), (max-width: 1100px) calc(50vw - 45px), (max-width: 1276px) calc(50vw - 61px), 577px";
const HERO_SIZES = "(max-width: 720px) calc(100vw - 40px), (max-width: 1276px) 52vw, 649px";

export function CourseCatalog({ courses }: { courses: readonly ThematicCourse[] }) {
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <div className="container">
        <header className={styles.intro}>
          <h1>За пределами курса</h1>
          <p>{COURSES_DESCRIPTION}</p>
        </header>
        <ul className={styles.grid} role="list" aria-label="Направления">
          {courses.map(course => (
            <li className={styles.card} key={course.slug} data-tone={course.tone}>
              <div className={styles.cardCover}>
                <Image src={course.cover} alt="" fill sizes={CARD_SIZES} className={styles.artwork} />
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardHeading}>
                  <h2>
                    <Link
                      className={styles.cardLink}
                      href={`/courses/${course.slug}`}
                      aria-describedby={`${course.slug}-description`}
                    >
                      {course.title}
                    </Link>
                  </h2>
                  <span className={styles.cardArrow}><ArrowUpRight size={20} aria-hidden="true" /></span>
                </div>
                <p id={`${course.slug}-description`}>{course.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export function CourseOverview({ course }: { course: ThematicCourse }) {
  return (
    <main id="main" tabIndex={-1} className={`${styles.page} ${styles.overview}`} data-tone={course.tone}>
      <div className="container">
        <Button asChild variant="outline" size="sm" className={styles.back}>
          <Link href="/courses"><ArrowLeft size={16} aria-hidden="true" /> К тематическим курсам</Link>
        </Button>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
          </div>
          <div className={styles.heroCover}>
            <Image
              src={course.cover}
              alt=""
              fill
              sizes={HERO_SIZES}
              className={styles.artwork}
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </header>
        <section className={styles.lessons} aria-labelledby="course-status">
          <span className={styles.lessonsIcon}><BookOpen size={24} aria-hidden="true" /></span>
          <div>
            <h2 id="course-status">Курс находится в разработке</h2>
            <p>Здесь появятся уроки по этому направлению.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
