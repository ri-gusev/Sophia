import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findReaderWork } from "@/features/reader/reader-catalog";

export async function GET(_request: Request, { params }: {
  params: Promise<{ workId: string; sectionId: string }>;
}) {
  const { workId, sectionId } = await params;
  const work = findReaderWork(workId);
  const section = work?.sections.find(item => item.id === sectionId);
  if (!work || !section) return new Response(null, { status: 404 });

  try {
    const content = await readFile(join(process.cwd(), "src/features/reader/corpus", work.id, section.id + ".json"), "utf8");
    return new Response(content, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
