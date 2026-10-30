import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Основной курс философии — Sophia",
  description: "Основной курс философии Sophia. Раздел находится в разработке.",
};

export default function LearnPage() {
  return (
    <main id="main" className="learn-placeholder container">
      <h1>Основной курс философии</h1>
      <p>Раздел находится в разработке</p>
      <Button asChild variant="outline"><Link href="/"><ArrowLeft size={17} aria-hidden="true" />Вернуться на главную</Link></Button>
    </main>
  );
}
