#!/usr/bin/env node
/**
 * npm version の lifecycle 用: APP_CHANGELOG 先頭に新バージョンのエントリを追加する。
 *
 * リリース自動化ワークフロー（release-develop-to-main.yml）は、developへ取り込まれた
 * 差分から利用者向けの更新履歴を生成し、環境変数 RELEASE_CHANGELOG で渡してくる。
 * 設定されていればその内容を changes へ反映する。未設定・空のとき（ローカルで
 * `npm version` を叩いた場合など）は、従来どおり手で埋めるための枠だけを作る。
 *
 * あわせて利用者向けの使い方（操作手順）が RELEASE_USAGE で渡ってくる（guchi-apps/issue-deck#1729）。
 * RELEASE_CHANGELOG が「何が変わったか」、RELEASE_USAGE が「どう使うか」で読む場面が違うため、
 * changes へ混ぜず usage という別の項目として持たせる。画面で使える変化が無いリリースでは
 * 生成されず空文字で渡るので、そのときは usage の項目ごと出力しない。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const changelogPath = join(__dirname, "../src/lib/changelog.ts");

export const CHANGELOG_PLACEHOLDER = "（変更内容を追記してください）";

/**
 * RELEASE_CHANGELOG の文面を changes 配列へ整形する。
 * 生成される文面は箇条書き・段落のどちらもありうるため、行単位に分解し、
 * 箇条書き記号と番号を落として1行1項目にそろえる。
 */
export function parseReleaseChangelog(raw) {
  return (raw ?? "")
    .split("\n")
    .map((line) => line.trim().replace(/^(?:[-*・]|\d+[.)])\s*/, "").trim())
    .filter((line) => line !== "");
}

/**
 * RELEASE_USAGE の文面を usage 配列へ整形する。
 * `1. ` で始まる番号付きの複数行で渡るため、行ごとに1手順として保持する
 * （表示側で番号を振り直すので、文面側の番号・箇条書き記号は落とす）。
 * 番号を持たない行は前の手順の折り返しとみなして連結し、手順を分断しない。
 */
export function parseReleaseUsage(raw) {
  const steps = [];
  for (const rawLine of (raw ?? "").split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;

    const isNewStep = /^(?:[-*・]|\d+[.)])\s*/.test(line);
    const text = line.replace(/^(?:[-*・]|\d+[.)])\s*/, "").trim();
    if (text === "") continue;

    if (isNewStep || steps.length === 0) {
      steps.push(text);
    } else {
      steps[steps.length - 1] = `${steps[steps.length - 1]} ${text}`;
    }
  }
  return steps;
}

// changes は生成された文面をそのまま埋め込むため、TypeScriptの文字列リテラルを
// 壊さないようにエスケープする。
function escapeForTs(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function insertChangelogEntry(
  content,
  version,
  date,
  changes = [],
  usage = []
) {
  if (content.includes(`version: "${version}"`)) {
    return { content, inserted: false };
  }

  const marker = "export const APP_CHANGELOG: ChangelogEntry[] = [";
  const index = content.indexOf(marker);
  if (index === -1) {
    throw new Error("APP_CHANGELOG marker not found in changelog.ts");
  }

  const items = changes.length > 0 ? changes : [CHANGELOG_PLACEHOLDER];
  const insertAt = index + marker.length;
  // 使い方は空のとき項目ごと省く（空の見出しだけが残ると書き漏らしに見えるため）。
  const usageBlock =
    usage.length > 0
      ? `
    usage: [
${usage.map((step) => `      "${escapeForTs(step)}",`).join("\n")}
    ],`
      : "";
  const entry = `
  {
    version: "${version}",
    date: "${date}",
    changes: [
${items.map((item) => `      "${escapeForTs(item)}",`).join("\n")}
    ],${usageBlock}
  },`;

  return {
    content: `${content.slice(0, insertAt)}${entry}${content.slice(insertAt)}`,
    inserted: true,
  };
}

function todayJst() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date()
  );
}

function main() {
  const version = process.env.npm_package_version;
  if (!version) {
    throw new Error("npm_package_version is not set (run via npm version)");
  }

  const changes = parseReleaseChangelog(process.env.RELEASE_CHANGELOG);
  const usage = parseReleaseUsage(process.env.RELEASE_USAGE);
  const original = readFileSync(changelogPath, "utf8");
  const { content, inserted } = insertChangelogEntry(
    original,
    version,
    todayJst(),
    changes,
    usage
  );

  if (!inserted) {
    console.log(`changelog.ts already has version ${version}; skipping.`);
    return;
  }

  writeFileSync(changelogPath, content, "utf8");
  const usageNote = usage.length > 0 ? `, ${usage.length} usage step(s)` : "";
  if (changes.length > 0) {
    console.log(
      `Added changelog entry for v${version} (${changes.length} change(s)${usageNote})`
    );
  } else {
    console.log(`Added changelog stub for v${version}${usageNote}`);
  }
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main();
}
