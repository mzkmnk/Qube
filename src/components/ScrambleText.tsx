import React, { useEffect, useMemo, useState } from "react";
import { Text } from "ink";

interface ScrambleTextProps {
  base: string; // used for length and/or mixed mode reference
  fps?: number; // frames per second
  intensity?: number; // 0..1 probability a char scrambles per frame (mixed mode)
  mode?: "mixed" | "pure"; // pure: always random; mixed: flip per char
  length?: number; // override length; defaults to base.length
  scramblePunctuation?: boolean; // scramble punctuation too (e.g., ...)
  color?:
    | "black"
    | "red"
    | "green"
    | "yellow"
    | "blue"
    | "magenta"
    | "cyan"
    | "white"
    | "gray";
}

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  base,
  fps = 20,
  intensity = 0.25,
  mode = "mixed",
  length,
  scramblePunctuation = false,
  color = "yellow",
}) => {
  const charset = useMemo(() => DEFAULT_CHARSET.split(""), []);
  const effectiveLength = Math.max(1, length ?? base.length);
  const [display, setDisplay] = useState(
    base.padEnd(effectiveLength).slice(0, effectiveLength),
  );

  useEffect(() => {
    let mounted = true;
    const interval = Math.max(16, Math.floor(1000 / fps));

    const tick = () => {
      if (!mounted) return;
      const src = base.padEnd(effectiveLength).slice(0, effectiveLength);
      const next = src
        .split("")
        .map((ch) => {
          // keep spacing stable; punctuation optionally
          if (/\s/.test(ch)) return ch;
          if (!scramblePunctuation && /[.,:;!?\-_[\](){}]/.test(ch)) return ch;
          if (mode === "pure") {
            return charset[(Math.random() * charset.length) | 0];
          }
          // mixed mode
          if (Math.random() < intensity) {
            return charset[(Math.random() * charset.length) | 0];
          }
          return ch;
        })
        .join("");
      setDisplay(next);
    };

    const id = setInterval(tick, interval);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [
    base,
    fps,
    intensity,
    charset,
    mode,
    effectiveLength,
    scramblePunctuation,
  ]);

  return <Text color={color}>{display}</Text>;
};
