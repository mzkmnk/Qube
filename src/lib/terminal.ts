/**
 * Terminal helpers (no external deps)
 */

/**
 * Clear the terminal screen. Optionally clears scrollback, similar to `clear`.
 */
export function clearTerminal(options: { scrollback?: boolean } = {}): void {
  const { scrollback = true } = options;

  // Respect non-interactive environments
  if (!process.stdout || !process.stdout.isTTY) return;

  // ANSI escape sequences:
  // - ESC[2J: Clear screen
  // - ESC[3J: Clear scrollback buffer
  // - ESC[H : Move cursor to home position
  // Use order that works across common terminals.
  const ESC = "\x1B[";
  const sequences = [
    ESC + "2J",
    scrollback ? ESC + "3J" : "",
    ESC + "H",
  ].filter(Boolean);

  process.stdout.write(sequences.join(""));
}
