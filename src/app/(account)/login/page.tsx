import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForm } from "@/features/account/account-form";
import { accountReturnPath } from "@/features/account/return-path";
import { currentAccount } from "@/features/account/server/viewer";

export const metadata: Metadata = { title: "Вход — Sophia" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; reset?: string | string[] }> }) {
  const query = await searchParams;
  const destination = accountReturnPath(query.next);
  if (await currentAccount().catch(() => null)) redirect(destination);
  return <AccountForm mode="login" destination={destination} recoveryComplete={query.reset === "success"} />;
}
