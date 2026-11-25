import { LegalPage, legalMetadata } from "@/features/legal/legal-page";

export const generateMetadata = () => legalMetadata("consent");

export default function Page() {
  return <LegalPage kind="consent" />;
}
