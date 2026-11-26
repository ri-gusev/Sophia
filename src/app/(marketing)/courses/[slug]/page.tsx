import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findThematicCourse, THEMATIC_COURSES } from "@/features/thematic-courses/catalog";
import { CourseOverview } from "@/features/thematic-courses/course-pages";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return THEMATIC_COURSES.map(({ slug }) => ({ slug }));
}

async function getCourse(params: Props["params"]) {
  const { slug } = await params;
  const course = findThematicCourse(slug);
  if (!course) notFound();
  return course;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourse(params);
  return { title: `${course.title} — Sophia`, description: course.description };
}

export default async function ThematicCoursePage({ params }: Props) {
  return <CourseOverview course={await getCourse(params)} />;
}
