import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForm } from "@/features/account/account-form";
import { currentAccount } from "@/features/account/server/viewer";

export const metadata: Metadata = { title: "Регистрация — Sophia" };

export default async function RegisterPage() {
  if (await currentAccount().catch(() => null)) redirect("/profile");
  return <AccountForm mode="register" />;
}
