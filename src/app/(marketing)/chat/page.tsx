import type { Metadata } from "next";
import { PhilosopherConversation } from "@/features/philosopher-conversation/philosopher-conversation";

export const metadata: Metadata = {
  title: "Разговор с философом — София",
};

export default function ChatPage() {
  return <PhilosopherConversation standalone />;
}
