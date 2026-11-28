import type { Metadata } from "next";
import { AccountForm } from "@/features/account/account-form";

export const metadata: Metadata = { title: "Новый пароль — София", referrer: "no-referrer", robots: { index: false } };
export default function ResetPasswordPage() {
  return <AccountForm mode="reset" />;
}
