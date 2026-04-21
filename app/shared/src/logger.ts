import pino from "pino";
import fs from "node:fs";
import path from "node:path";

// JSON-line logger. Writes to stdout for humans and (when LOG_FILE is set)
// to a rotated file that the OTel collector's filelog receiver tails and
// forwards to Loki. Keeps the app free of transport-worker complexity.
export function createLogger(service: string) {
  const level = (process.env.LOG_LEVEL ?? "info") as pino.Level;
  const logFile = process.env.LOG_FILE;
  const streams: pino.StreamEntry[] = [{ stream: process.stdout, level }];

  if (logFile) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    streams.push({
      stream: fs.createWriteStream(logFile, { flags: "a" }),
      level,
    });
  }

  return pino(
    {
      level,
      base: { service },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream(streams),
  );
}
