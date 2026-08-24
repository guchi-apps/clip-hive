# clip-hive — エージェント向けガイド

動画URLと動画ファイルを一元管理する個人向けPWAアプリ。技術スタック・セットアップ手順は
[README.md](./README.md) を参照する。ここには、エージェント（Claude Code）が守る運用ルールと、
READMEに書かれていない判断基準だけを書く。

**GitHub Actions 上での無人実行は、このリポジトリをチェックアウトしたワークツリーしか参照できない。**
ローカル実行ではユーザー個人環境のグローバルルール（`~/.claude/CLAUDE.md`）も読み込まれるが、
無人実行では読み込まれない。したがって無人実行でも守られる必要があるルールは、このファイルに
明文化しておく必要がある。

## 検証コマンド

| 目的 | コマンド |
|---|---|
| Lint | `npm run lint` |
| 型チェック | `npm run typecheck` |
| ビルド | `npm run build:ci` |
| マイグレーション適用 | `npm run db:migrate:deploy` |

`npm test` は `lint && typecheck` の別名で、テストランナーは動かない（このリポジトリに
自動テストは無い）。`npm run build` と `npm run build:ci` は同じ内容（`prisma generate && next build --webpack`）で、
どちらもラッパーを通さないため無人実行から使える。

`npm run dev` は `scripts/dev.sh` 経由で `scripts/ensure-mysql.sh` を呼び、ローカルの MySQL/MariaDB と
`.env.local` を要求する。**無人実行では使えない。**

## マイグレーションを生成したとき

`prisma migrate dev` / `prisma migrate diff --script` は生成したSQLを **stdout** へ書き出す。
`prisma.config.ts` で読み込んでいる dotenv も v17 から案内文を stdout へ出すため、
`quiet: true` を外すと案内文が `migration.sql` の1行目に混ざり、本番の
`prisma migrate deploy` が構文エラー（MariaDB 1064 → P3018）で落ちる（#72）。

生成した `migration.sql` は `head -1` が `--` か `CREATE` / `ALTER` 等で始まっていることを
確認してからコミットする。

## マルチエージェント運用（GitHub Actions 無人実行）

`@claude` コメントを起点に、計画提示〜実装〜develop向けPR作成までを GitHub Actions 上で無人実行する。
ワークフローの実体は `guchi-apps/issue-deck` にあり、このリポジトリの `.github/workflows/` には
`uses:` で参照する薄い caller だけを置いている。参照する共有ワークフローのタグは
`.github/workflows/` の `uses:` を正とする（このファイルにはタグ名を書かない。タグを上げるたびに
書き換えが必要になり、齟齬が再発するため）。

設計・運用の詳細は issue-deck 側を参照する。

- 進捗管理の設計: [progress-status-architecture.md](https://github.com/guchi-apps/issue-deck/blob/main/docs/progress-status-architecture.md)
- 無人実行の挙動: [multi-agent/dispatch.md](https://github.com/guchi-apps/issue-deck/blob/main/docs/multi-agent/dispatch.md)

### ブランチ

- 機能開発: `develop`
- 安定版 / 本番デプロイ: `main`（マージ時に GitHub Actions が VPS へデプロイ）

Issue専用ブランチは `develop` から作成し、ブランチ名は **`issue-<Issue番号>`** とする（例: `issue-21`）。
ワークフローはブランチ名から対象Issueを特定するため、**この命名規約に従わないブランチはすべて対象外**になる。

デフォルトブランチは `develop` にしておく。`issues`・`issue_comment` イベントはデフォルトブランチの
ワークフローしか起動しないため、`main` にすると `@claude` コメントに反応しなくなる。

### Issueの進捗

**進捗は GitHub Projects の Status で管理する。進捗ラベルは存在しない**
（issue-deck#1010 / #991 Phase 5 で `01.wip`〜`09.main` を廃止した）。

1. `Ready` — 未着手
2. `Planning` — 計画検討中（`21.plan-required` 選択時のみ経由）
3. `Implementation` — 実装中
4. `Develop PR` — developへPR作成・マージ中
5. `Develop` — developへマージ完了（main未反映）
6. `Release` — mainへPR作成・マージ中
7. `Done` — mainへマージ完了。この時点でissueをcloseする

**`gh issue edit` で進捗を進めることはできない。** Status を書けるのは issue-deck だけで、
ワークフローは進捗報告API（`POST /api/progress`）へ報告する。ブランチのpush・PR作成・PRマージを
トリガーに自動で遷移するため、エージェントが自分で進捗を動かす必要はない。

### リリース（develop→main）

**リリースは issue-deck の画面から起動する。** ヘッダーのロケットアイコン、またはブランチの流れ画面の
リリースボタンが `.github/workflows/release-develop-to-main.yml` を `workflow_dispatch` で起動し、
次の順に進む（issue-deck#1591）。

1. バージョンbump PR（`release/vX.Y.Z` → `develop`）が作られる。上げ幅は画面で指定するか、
   main と develop のコード差分から自動判定する。CI通過後に develop へ自動マージされる
2. バンプPRのマージで `package.json` が変わると同じワークフローが再度起動し、develop → main の
   リリースPRを作る
3. **リリースPRのマージは人が行う**（自動マージ不可カテゴリ）。マージすると `deploy.yml` が
   `v<version>` タグを作り、VPS へデプロイする

バンプ時には `scripts/version-changelog.mjs` が `src/lib/changelog.ts` の先頭へ新バージョンの
エントリを差し込む。文面は共有ワークフローが差分から生成して `RELEASE_CHANGELOG` で渡してくるので、
**バンプPRのレビュー時に内容を確認し、必要なら直す**（利用者が読む文章のため）。

エージェントはこのフローを自分で起動しない。バージョンを手で書き換える必要もない
（`package.json` の `version` はバンプPRだけが更新する）。

### 条件を表すラベル（進捗とは別軸）

Status = 今どこにいるか、Label = どんな性質・条件があるか、という役割分担にしている。

| ラベル | 意味 |
|---|---|
| `00.check-user` | ユーザーの確認・指示が必要。どの段階でも併用する |
| `00.qa-answered` | 質問への回答のみ完了（`00.check-user` と常に併用） |
| `11.local` | ローカル（VSCode等）で対応中。付いている間は無人実行を起動しない |
| `21.plan-required` | 実装前に計画を提示し承認を得る |
| `22.merge-confirm-required` | 内容によらず、developへのマージ前に必ず `00.check-user` を付ける |
| `23.preview-required` | PR作成前に開発サーバーでの画面確認を必須にする |
| `24.screenshot-required` | PR作成前にスクリーンショット取得を必須にする |
| `71.manual-step` | エージェントが代行できないユーザー自身の手作業 |

### 自動マージ不可カテゴリ

以下に該当する変更は自動マージせず `00.check-user` を付与してユーザーの確認を待つ。

- 認証・認可（`src/auth.ts`・`src/auth.config.ts`・`src/proxy.ts`）
- DBスキーマ変更・マイグレーション（`prisma/migrations/**`）
- 本番環境の設定（`deploy/**`）
- GitHub Actionsやデプロイ設定（`.github/workflows/**`）
- Secretsや環境変数（`.env*`・`scripts/sync-github-secrets.sh`）
- 課金・決済
- 大規模な依存関係の更新
- `develop` → `main` のマージ

### 実装エージェントの禁止事項

- `main` / `develop` への直接コミット・push
- 他Issueのブランチの編集
- 担当Issue以外の実装（別件を新規Issueとして起票するのはよい）
- 不要なforce push
- 自分が作成したPull Requestの自己マージ

### コミット・PR・コメントの書き方

- コミットメッセージ・PRタイトル・PR本文・issueコメントは**日本語**で書く
- コミットの author は `Claude Code <claude-code@example.com>` にする
- `develop` 宛のPR本文には、対応Issue・実装内容・テスト内容・確認方法・注意点を記載する。
  developマージ時点ではissueをcloseしない運用のため、`closes #番号` / `fixes #番号` は使わず
  `#番号` のみ記載する

### 依存関係の追加

新しい依存関係を追加する前には、必ずユーザーに確認を取る。無人実行では確認相手がいないため、
追加が必要だと判断した場合は追加せずに作業を止め、`00.check-user` を付与したうえで
なぜ必要かをIssueコメントで相談する。

### シークレットの扱い

APIキー・トークン・パスワード等の実シークレットをコミットしない。コミットしてよいのは値を空にした
サンプル（`.env.example`・`.env.local.example`）と、1Passwordの `op://vault/item/field` 形式の参照だけを
書いたテンプレート（`.env.tpl` 等）に限る。実値は `.gitignore` 済みの `.env*` と1Password側、および
GitHubのsecret/variableにのみ置く。

**実行時の1Password呼び出しは行わない**（issue-deck#1307）。GitHub Actions は GitHubの
secret/variable から値を取得する。

**このリポジトリは public。** コード・コミット履歴・Issue・Pull Request・コメントに加え、
GitHub Actions の実行ログとビルド成果物も誰でも閲覧・ダウンロードできる（#51）。以下は
「漏らさない」ためのルールであると同時に、**書いた時点で公開される**という前提でもある。

**PII（個人のメールアドレス・実IP・実ホスト名）もシークレットと同じに扱う。** コードや設定ファイル
だけでなく、Issue・Pull Request・コメント、および `*.example` などのサンプルも対象にする。
サンプルには `you@example.com`・`example.com` のようなダミー値だけを書く。
実際に `.env.local.example` の `ALLOWED_EMAIL` へ個人のGoogleアカウントを書いていたことがあり、
全履歴の書き換えとGitHub Supportへのパージ依頼という重い作業を招いた（#51）。
