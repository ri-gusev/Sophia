import type { Metadata } from "next";
import { PhilosopherConversation } from "@/features/philosopher-conversation/philosopher-conversation";

export const metadata: Metadata = {
  title: "Разговор с философом — Sophia",
};

export default function ChatPage() {
  return <PhilosopherConversation standalone />;
}
