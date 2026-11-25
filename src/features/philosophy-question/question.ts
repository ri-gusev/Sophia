import { cycleStartDay } from "./daily-calendar";
import corpus from "./daily-questions.json";

export type DailyQuestion = {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source: string;
  sourceUrl: string;
  reference: string;
};

export const dailyQuestions: readonly DailyQuestion[] = corpus;

export function questionForDay(day: number): DailyQuestion {
  const count = dailyQuestions.length;
  return dailyQuestions[((day - cycleStartDay) % count + count) % count];
}
