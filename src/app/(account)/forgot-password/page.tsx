import type { Metadata } from "next";
import { AccountForm } from "@/features/account/account-form";

export const metadata: Metadata = { title: "Восстановление доступа — Sophia", robots: { index: false } };
export default function ForgotPasswordPage() {
  return <AccountForm mode="forgot" />;
}
