import catalog from "./corpus/catalog.json";
import type { ReaderWork } from "./reader-types";

export const readerCatalog: readonly ReaderWork[] = catalog;

export function findReaderWork(id: string) {
  return readerCatalog.find(work => work.id === id);
}
