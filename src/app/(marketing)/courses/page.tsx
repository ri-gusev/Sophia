import type { Metadata } from "next";
import { THEMATIC_COURSES } from "@/features/thematic-courses/catalog";
import { CourseCatalog, COURSES_DESCRIPTION } from "@/features/thematic-courses/course-pages";

export const metadata: Metadata = {
  title: "Тематические курсы — София",
  description: COURSES_DESCRIPTION,
};

export default function CoursesPage() {
  return <CourseCatalog courses={THEMATIC_COURSES} />;
}
