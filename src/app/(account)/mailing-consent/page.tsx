import { LegalPage, legalMetadata } from "@/features/legal/legal-page";

export const generateMetadata = () => legalMetadata("mailings");

export default function Page() {
  return <LegalPage kind="mailings" />;
}
