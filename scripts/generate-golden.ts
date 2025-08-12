/**
 * fixtures/streams/*.txt を読み、StreamProcessor で処理した履歴行を
 * fixtures/golden/*.txt に保存するジェネレータ。
 *
 * 仕様:
 * - 各フィクスチャは生のストリーム（CR/ANSI/部分行含む）を含める
 * - 行頭が ">>SET_LAST_CMD: " の行はディレクティブとして解釈（エコーバック抑制用）
 *   - 当該行はストリームには流さない
 * - それ以外の行はそのままストリームとして流す（末尾の改行有無は原文準拠）
 * - ストリーム投入は 1 文字ずつに分割して行い、バッファリング挙動を再現
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { StreamProcessor } from "../src/lib/stream-processor";

const ROOT = process.cwd();
const STREAMS_DIR = path.join(ROOT, "fixtures", "streams");
const GOLDEN_DIR = path.join(ROOT, "fixtures", "golden");

async function* iterLinesPreservingNewline(source: string): AsyncGenerator<{
  text: string;
  hasNewline: boolean;
}> {
  let buf = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    buf += ch;
    if (ch === "\n") {
      // emit line excluding the trailing \n, but tell caller it existed
      yield { text: buf.slice(0, -1), hasNewline: true };
      buf = "";
    }
  }
  if (buf.length > 0) {
    yield { text: buf, hasNewline: false };
  }
}

async function processFixture(filePath: string): Promise<{ lines: string[] }> {
  const raw = await fs.readFile(filePath, "utf8");
  const collectedLines: string[] = [];

  const processor = new StreamProcessor({
    onLinesReady: (lines: string[]) => {
      for (const line of lines) collectedLines.push(line);
    },
    onProgressUpdate: (_line: string | null) => {
      // Golden には履歴行のみを保存するため、進捗は記録しない
    },
  });

  for await (const { text, hasNewline } of iterLinesPreservingNewline(raw)) {
    // ディレクティブ処理
    if (text.startsWith(">>SET_LAST_CMD: ")) {
      const cmd = text.replace(">>SET_LAST_CMD: ", "");
      processor.setLastSentCommand(cmd);
      continue; // ストリームには流さない
    }
    if (text.startsWith("#")) {
      // コメント行（説明用）
      continue;
    }

    // ストリームに投入（1 文字ずつ）
    const payload = hasNewline ? text + "\n" : text;
    for (let i = 0; i < payload.length; i++) {
      const chunk = payload[i];
      processor.processData("stdout", chunk);
    }
  }

  return { lines: collectedLines };
}

async function main(): Promise<void> {
  await fs.mkdir(GOLDEN_DIR, { recursive: true });
  await fs.mkdir(STREAMS_DIR, { recursive: true });

  const entries = await fs.readdir(STREAMS_DIR);
  const targets = entries.filter((f) => f.endsWith(".txt"));
  if (targets.length === 0) {
    console.warn(`No fixtures found in ${STREAMS_DIR}`);
  }

  for (const filename of targets) {
    const inputPath = path.join(STREAMS_DIR, filename);
    const base = filename.replace(/\.txt$/, "");
    const goldenPath = path.join(GOLDEN_DIR, `${base}.txt`);

    const { lines } = await processFixture(inputPath);
    const output = lines.join("\n") + (lines.length > 0 ? "\n" : "");
    await fs.writeFile(goldenPath, output, "utf8");
    console.log(`Generated: ${path.relative(ROOT, goldenPath)} (${lines.length} lines)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
