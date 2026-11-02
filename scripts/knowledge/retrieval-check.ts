/** Small, explicit domain relevance calibration. Prints no private snippets or vectors. */
import { loadEnvFile } from "node:process";
import { DatabaseSync } from "node:sqlite";
import { ragConfig } from "../../src/features/philosopher-conversation/server/rag/config.ts";
import { createEmbedder } from "../../src/features/philosopher-conversation/server/rag/embeddings.ts";
import { cosine, indexStatus, searchIndex } from "../../src/features/philosopher-conversation/server/rag/index-store.ts";
loadEnvFile(".env.local");
const config = ragConfig(), path = "storage/knowledge/sophia-knowledge.sqlite";
if (!indexStatus(path, config).ready) throw new Error("Index not ready");
const queries = [
  { id: "justice", text: "Как Платон понимает справедливость?", relevant: true },
  { id: "ideas", text: "Чем мир идей отличается от чувственных вещей?", relevant: true },
  { id: "knowledge", text: "В чём различие знания и мнения?", relevant: true },
  { id: "soul", text: "Как устроена душа в философии Платона?", relevant: true },
  { id: "virtue", text: "Можно ли научить добродетели?", relevant: true },
  { id: "cooking", text: "Рецепт приготовления ризотто с грибами", relevant: false },
  { id: "sports", text: "Результат вчерашнего футбольного матча", relevant: false },
  { id: "software", text: "Ошибка компиляции TypeScript сборщика webpack", relevant: false },
];
const vectors = await createEmbedder(config)(queries.map(query => query.text));
const db = new DatabaseSync(path, { readOnly: true });
const index = db.prepare("SELECT embedding FROM rag_chunks WHERE philosopher_id=?").all("plato").map(row => JSON.parse(String(row.embedding)) as number[]);
db.close();
const report = queries.map((query, i) => ({ id: query.id, relevant: query.relevant, maxCosine: Number(Math.max(...index.map(vector => cosine(vectors[i], vector))).toFixed(4)), retrieved: searchIndex(path, query.text, vectors[i], config).length }));
const minPositive = Math.min(...report.filter(item => item.relevant).map(item => item.maxCosine));
const maxNegative = Math.max(...report.filter(item => !item.relevant).map(item => item.maxCosine));
console.log(JSON.stringify({ threshold: config.threshold, report, minPositive, maxNegative,
  positiveRecall: report.filter(item => item.relevant && item.retrieved > 0).length / queries.filter(item => item.relevant).length,
  negativeExclusion: report.filter(item => !item.relevant && item.retrieved === 0).length / queries.filter(item => !item.relevant).length,
  note: "Small domain-relevance sample, not a claim-level ground-truth benchmark" }, null, 2));
