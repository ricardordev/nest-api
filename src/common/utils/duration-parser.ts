/**
 * Parses a human-readable duration string into milliseconds.
 *
 * Supported formats: "15s", "10m", "2h", "7d"
 * Falls back to `defaultMs` if the string cannot be parsed.
 */
export function parseDurationMs(raw: string, defaultMs: number): number {
  const durationRegex = /^(\d+)\s*([smhd])$/i;
  const match = durationRegex.exec(raw);

  if (!match) return defaultMs;

  const value = Number(match[1]);
  switch (match[2].toLowerCase()) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return defaultMs;
  }
}
