import {
  EXPECTED_PROGRESS_ACCOUNT_HEADER, PROGRESS_BODY_LIMIT, parseProgressMutation,
} from "@/features/account/progress/contract";
import { applyProgressMutation, readAccountProgress } from "@/features/account/progress/server/store";
import { accountDb } from "@/features/account/server/database";
import { AccountError, readJson, verifyOrigin } from "@/features/account/server/http";
import { readSession } from "@/features/account/server/session";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

function failure(error: unknown) {
  if (error instanceof AccountError) return Response.json({ error: error.message }, { headers, status: error.status });
  return Response.json({ error: "Не удалось загрузить или сохранить учебный прогресс." }, { headers, status: 503 });
}

export async function GET(request: Request) {
  try {
    const user = await readSession();
    if (!user) throw new AccountError(401, "Войди в аккаунт, чтобы открыть учебный прогресс.");
    const expected = request.headers.get(EXPECTED_PROGRESS_ACCOUNT_HEADER);
    if (expected !== null && expected !== user.id) throw new AccountError(409, "Аккаунт изменился. Обнови страницу.");
    return Response.json({ accountId: user.id, progress: readAccountProgress(user.id) }, { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const user = await readSession();
    if (!user) throw new AccountError(401, "Войди в аккаунт, чтобы сохранить учебный прогресс.");
    const body = await readJson(request, PROGRESS_BODY_LIMIT);
    if (typeof body.expectedAccountId !== "string") throw new AccountError(400, "Не указан текущий аккаунт.");
    if (body.expectedAccountId !== user.id) throw new AccountError(409, "Аккаунт изменился. Обнови страницу.");
    const mutation = parseProgressMutation(body);
    if (!mutation) throw new AccountError(400, "Данные учебного прогресса имеют неверный формат.");
    // The session may have been revoked while the request body was arriving.
    if ((await readSession())?.id !== user.id) throw new AccountError(401, "Сеанс закончился. Войди в аккаунт ещё раз.");
    return Response.json({ accountId: user.id, ...applyProgressMutation(accountDb(), user.id, mutation) }, { headers });
  } catch (error) {
    if (!request.body?.locked) void request.body?.cancel().catch(() => undefined);
    return failure(error);
  }
}
