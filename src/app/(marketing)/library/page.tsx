import type { Metadata } from "next";
import { Library } from "@/features/reader/library";
import { readerCatalog } from "@/features/reader/reader-catalog";

export const metadata: Metadata = { title: "Библиотека — София" };

export default function LibraryPage() {
  return <Library works={readerCatalog.map(({ id, title, author, epoch, description, cover, sections, unavailableReason }) => ({
    id, title, author, epoch, description, cover, unavailableReason, available: sections.length > 0,
  }))} />;
}
