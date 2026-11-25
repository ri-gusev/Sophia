import { LegalPage, legalMetadata } from "@/features/legal/legal-page";

export const generateMetadata = () => legalMetadata("terms");

export default function Page() {
  return <LegalPage kind="terms" />;
}
