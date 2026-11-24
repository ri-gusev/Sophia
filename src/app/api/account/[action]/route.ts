import { after, type NextRequest } from "next/server";
import { handleAccountRequest } from "@/features/account/server/account-http";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  return handleAccountRequest(request, action, name => request.cookies.get(name)?.value, after);
}
