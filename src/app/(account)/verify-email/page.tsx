import type { Metadata } from "next";
import { AccountForm } from "@/features/account/account-form";
import { availableLegalVersions } from "@/features/legal/server/revisions";

export const metadata: Metadata = { title: "Подтверждение email — Sophia", referrer: "no-referrer", robots: { index: false } };
export default function VerifyEmailPage() {
  return <AccountForm mode="verify" legalVersions={availableLegalVersions()} />;
}
