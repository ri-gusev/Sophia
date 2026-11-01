import { parseArgs } from "node:util";
import { KnowledgeStore } from "./knowledge-store.ts";

function required(value: string | undefined, option: string): string {
  if (!value) throw new Error(`Missing --${option}.`);
  return value;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!["import", "status", "verify"].includes(command)) throw new Error("Use import, status or verify.");
  const { values } = parseArgs({ args, options: {
    file: { type: "string" }, document: { type: "string" }, title: { type: "string" },
    philosopher: { type: "string" }, "philosopher-name": { type: "string" },
    topic: { type: "string" }, "topic-name": { type: "string" },
  } });
  const store = new KnowledgeStore();
  try {
    if (command === "status") return store.status();
    if (command === "verify") {
      const result = store.verifyDocument(required(values.document, "document"));
      if (!result.databaseMatches || !result.archiveMatches) process.exitCode = 1;
      return result;
    }
    if (Boolean(values.topic) !== Boolean(values["topic-name"])) throw new Error("Supply both --topic and --topic-name.");
    return store.importFile({
      filePath: required(values.file, "file"),
      documentId: required(values.document, "document"),
      title: required(values.title, "title"),
      philosophers: [{ id: required(values.philosopher, "philosopher"), name: required(values["philosopher-name"], "philosopher-name") }],
      topics: values.topic ? [{ id: values.topic, name: values["topic-name"]! }] : [],
    });
  } finally {
    store.close();
  }
}

try {
  console.log(JSON.stringify(main(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Knowledge storage command failed.");
  process.exitCode = 1;
}
