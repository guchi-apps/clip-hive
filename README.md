# clip-hive

動画URLと動画ファイルを一元管理する個人向けPWAアプリ。タイトル・タグ・動画時間・備考を登録し、タグで絞り込み・検索できる。

## 技術スタック

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix UI)
- Prisma + MariaDB/MySQL
- NextAuth.js v5 (Google OAuth、本人のみアクセス可)
- next-pwa (PWA対応)
- AWS SDK for S3 (`@aws-sdk/client-s3` / `@aws-sdk/lib-storage`) — 外部ストレージ(S3互換)保存用

## セットアップ

### 前提

- Node.js >= 20.19.0
- MySQL/MariaDB がローカルで起動していること

### 手順

```bash
npm install

# .env.local を作成（DB/Auth/Google/Storage の値を編集する）
npm run env:init

# .env.local の DATABASE_URL に基づき DB・ユーザーを作成
npm run db:setup

# マイグレーション適用
npm run db:migrate:dev

# 開発サーバー起動
npm run dev
```

Google OAuth を使う場合は、開発用の Google Cloud クライアントを別途用意し、承認済みリダイレクト URI に `http://localhost:3000/api/auth/callback/google` を登録する。

## 主なスクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（`prisma generate` を含む） |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック（`tsc --noEmit`） |
| `npm run db:setup` | `.env.local` の `DATABASE_URL` から DB・ユーザーを作成 |
| `npm run db:migrate:dev` | 開発用マイグレーション適用 |
| `npm run db:migrate:deploy` | 本番用マイグレーション適用 |
| `npm run db:studio` | Prisma Studio 起動 |

## ディレクトリ構成

```
src/
├── app/            # ルーティング（App Router）、API ルート、認証ページ
├── components/     # UI コンポーネント（ui/ 含む）
├── lib/            # DB クライアント、ストレージ抽象化層、バリデーション等
└── types/          # 型定義
prisma/             # スキーマ・マイグレーション
scripts/            # 開発・DBセットアップ用スクリプト
deploy/             # PM2 設定
```

## データモデル

- `Video`: 動画本体（タイトル・登録方式(URL/FILE)・URL・保存先情報・動画時間(秒)・備考・タグ）
- `Tag`: ユーザーごとのタグ辞書。名前で一意（`@@unique([userId, name])`）
- 動画時間はDBには秒(Int)で保持し、UI上は分単位（小数可）で入出力する
- 削除はゴミ箱方式（`Video.deletedAt` による論理削除）。ゴミ箱から「完全削除」した場合のみ、実ファイルとDBレコードを完全に削除する
- 同一ユーザー内でのURL重複登録は禁止（`@@unique([userId, url])`）。動画ファイルのハッシュ値による重複判定は行わない

## 保存先ストレージ（LOCAL / S3互換）

`STORAGE_DRIVER` 環境変数でアップロード時の保存先を切り替える。

- `LOCAL`（既定）: サーバーのディスク（`STORAGE_LOCAL_DIR`、既定 `./storage`）に保存
- `S3`: S3互換ストレージ（Cloudflare R2 / MinIO 等）に保存。`S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_FORCE_PATH_STYLE` を設定する

アップロード済みの動画は、アップロード時点のドライバを `Video.storageDriver` に記録しているため、`STORAGE_DRIVER` を後から切り替えても既存ファイルの取得先を見失わない（新規アップロード分のみ新しいドライバに保存される。既存ファイルの移行は別途手動対応が必要）。

## 容量制限

`STORAGE_QUOTA_GB`（既定20GB）で合計保存容量の上限を設定する。上限を超えるアップロードは拒否される。現時点では管理画面からの変更には対応しておらず、環境変数の変更のみで調整する。

## PWA / オフライン対応

`next-pwa` により、動画一覧・タグ一覧のAPIレスポンスをNetwork Firstでキャッシュしており、オフライン時も直近取得した一覧・タグ検索を閲覧できる。動画ファイル自体（ダウンロード・再生）はオンライン時のみ利用可能。

## デプロイに使う値の管理（1Password → GitHub）

CI/CDワークフローは**実行時にはGitHubのsecret / variableからだけ値を取る**。1Passwordは「人が管理する唯一の正」として残し、実行時には呼び出さない（1Passwordサービスアカウントの日次レート制限がフリート全体のデプロイを止めたため。guchi-apps/issue-deck#1302 / #1307）。

- どの値をGitHub側のどこから取るかは `.github/secrets-manifest.tsv` が正。`SCOPE` が `inherit` の8件はorganizationの共通値（`SHARED_DB_*` / `SERVER_*`）を参照し、`repo` の9件はこのリポジトリのsecret / variableに置く（`PORT` はマニフェストで管理せず `deploy.yml` に平文で持つ）
- 1Password側の値を変えたときだけ `scripts/sync-github-secrets.sh` で同期する。`op` は**個人アカウントのセッション**で動かす（サービスアカウントでは書き込めない）

```bash
op signin
scripts/sync-github-secrets.sh --dry-run
scripts/sync-github-secrets.sh
```

同期はGitHubのActionsからも起こせる（`.github/workflows/sync-secrets.yml` を `workflow_dispatch` で実行）。

## デプロイ・運用（未実施のセットアップ）

このリポジトリのコード・CI/CDワークフロー定義は用意済みだが、以下は実際の運用環境（1Password・VPS・DNS）への手動セットアップが必要（`_docs/README.md`「新規アプリ作成チェックリスト」参照）。

- 1Password `apps` ボールトに `clip-hive` アイテムを作成し、`.github/secrets-manifest.tsv` の `SOURCE` 列が参照するフィールド（`db-name`, `auth-secret`, `google-client-id` 等）を登録する
- Signaly でアプリ用チャンネルを作成し `ci-webhook-url` を登録する
- `scripts/sync-github-secrets.sh` を実行し、1Passwordの値をGitHubのsecret / variableへ投入する
- `main` ブランチの Branch protection（CI必須）を設定する
- VPS上に `/apps/clip-hive/` を作成し、Apache VirtualHost（本番ポート `3108`）を追加する
- 本番用 Google OAuth クライアントを作成し、リダイレクトURIを登録する
