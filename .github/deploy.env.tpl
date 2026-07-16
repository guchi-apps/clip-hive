# Vault: apps — clip-hive / DB / Server / githubaction-sshkey
SSH_PRIVATE_KEY=op://apps/githubaction-sshkey/private_key?ssh-format=openssh
HOST=op://apps/Server/host
USERNAME=op://apps/Server/username
SSH_PORT=op://apps/Server/ssh-port
TARGET_DIR=op://apps/clip-hive/target-dir
PORT=op://apps/clip-hive/port

DB_USER=op://apps/DB/db-user
DB_PASSWORD=op://apps/DB/db-password
DB_HOST=op://apps/DB/db-host
DB_PORT=op://apps/DB/db-port
DB_NAME=op://apps/clip-hive/db-name

AUTH_URL=op://apps/clip-hive/auth-url
AUTH_SECRET=op://apps/clip-hive/auth-secret
GOOGLE_CLIENT_ID=op://apps/clip-hive/google-client-id
GOOGLE_CLIENT_SECRET=op://apps/clip-hive/google-client-secret
ALLOWED_EMAIL=op://apps/clip-hive/allowed-email

SIGNALY_WEBHOOK_URL=op://apps/clip-hive/ci-webhook-url
SIGNALY_LOGIN_WEBHOOK_URL=op://apps/clip-hive/login-webhook-url

# 外部ストレージ(S3互換)へ切り替える場合のみ 1Password に追加して有効化する。
# 未追加のままだと 1Password 側にフィールドが無くデプロイが失敗するため、
# STORAGE_DRIVER=LOCAL の間はコメントアウトのままにしておく。
# S3_ENDPOINT=op://apps/clip-hive/s3-endpoint
# S3_REGION=op://apps/clip-hive/s3-region
# S3_BUCKET=op://apps/clip-hive/s3-bucket
# S3_ACCESS_KEY_ID=op://apps/clip-hive/s3-access-key-id
# S3_SECRET_ACCESS_KEY=op://apps/clip-hive/s3-secret-access-key
