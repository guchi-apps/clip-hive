#!/usr/bin/env bash
# .env.local の DATABASE_URL から MySQL の DB・ユーザーをセットアップする
#
# 使い方:
#   npm run env:init   # 初回のみ（.env.local.example をコピー）
#   npm run db:setup
#
# 前提: sudo mysql で root 接続できること（MySQL 起動済み）
# migrate dev はシャドウ DB 上で DDL を実行するため、*.* への ALTER 等が必要（下記 GRANT 参照）

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE がありません。npm run env:init" >&2
  exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: $ENV_FILE に DATABASE_URL がありません。" >&2
  exit 1
fi

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<<"$(python3 -c "
import sys, urllib.parse
u = urllib.parse.urlparse('$DATABASE_URL')
print(urllib.parse.unquote(u.username or ''), urllib.parse.unquote(u.password or ''), u.hostname or '', u.port or 3306, (u.path or '').lstrip('/'))
")"

escape_sql_string() {
  printf "%s" "$1" | sed "s/'/''/g"
}

validate_identifier() {
  local name="$1"
  local value="$2"
  if [[ ! "$value" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: ${name} に使えない文字が含まれています（英数字・_・- のみ）: ${value}" >&2
    exit 1
  fi
}

for var in DB_NAME DB_USER DB_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "Error: DATABASE_URL から ${var} を取得できませんでした。" >&2
    exit 1
  fi
done

validate_identifier "DB_NAME" "$DB_NAME"
validate_identifier "DB_USER" "$DB_USER"

DB_PASSWORD_ESC=$(escape_sql_string "$DB_PASSWORD")

echo "セットアップ対象:"
echo "  DB_NAME: ${DB_NAME}"
echo "  DB_USER: ${DB_USER}"
echo "  DB_PASSWORD: ***"

if ! command -v mysql >/dev/null 2>&1; then
  echo "Error: mysql コマンドが見つかりません。" >&2
  exit 1
fi

bash "$ROOT/scripts/ensure-mysql.sh"

sudo mysql <<EOSQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD_ESC}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD_ESC}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES, LOCK TABLES ON *.* TO '${DB_USER}'@'localhost';

CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD_ESC}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD_ESC}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES, LOCK TABLES ON *.* TO '${DB_USER}'@'127.0.0.1';

FLUSH PRIVILEGES;
EOSQL

echo "接続確認中..."
socket="/var/run/mysqld/mysqld.sock"
[[ -S /run/mysqld/mysqld.sock ]] && socket="/run/mysqld/mysqld.sock"

if mysql -u "$DB_USER" -p"$DB_PASSWORD" --socket="$socket" "$DB_NAME" -e "SELECT 1" >/dev/null 2>&1; then
  echo "OK: データベース・ユーザー作成完了（.env.local の DATABASE_URL と一致）"
else
  echo "Error: MySQL ユーザーは作成しましたが、.env.local の DATABASE_URL の認証情報で接続できません。" >&2
  exit 1
fi

echo "次: npm run db:migrate:dev -- --name init"
