import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

export function privateOrigin(value) {
  const url = URL.parse(value);
  if (!url || value !== url.origin || !["http:", "https:"].includes(url.protocol)) return false;
  if (["localhost", "[::1]"].includes(url.hostname)) return true;

  const octets = url.hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second] = octets;
  return first === 127 || first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

export function positiveInteger(input, name, max) {
  const value = Number(input);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}.`);
  return value;
}

export async function readServerManifest(file) {
  const server = JSON.parse(await readFile(file, "utf8"));
  if (!privateOrigin(server.origin) || new URL(server.origin).hostname !== '127.0.0.1' ||
      server.transport !== 'test' || !Number.isSafeInteger(server.pid) || server.pid < 1 || server.endedAt) {
    throw new Error("Use a running loopback test target from run.mjs.");
  }
  assertLocalDataPaths(file, server);
  return server;
}

export function assertLocalDataPaths(file, server) {
  const base = dirname(resolve(file));
  if (!server.path || !server.outbox || server.path === server.outbox || !isAbsolute(server.path) || !isAbsolute(server.outbox)
    || dirname(resolve(server.path)) !== base || dirname(resolve(server.outbox)) !== base) {
    throw new Error("The test database and file outbox must be inside the manifest directory.");
  }
}
