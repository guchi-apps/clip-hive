import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import type { PutObjectParams, RangeOptions, StorageAdapter } from "./types";

let client: S3Client | undefined;

// 必須の環境変数を取得する。未設定なら変数名入りでエラーにする。
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// R2 / MinIO 等の S3 互換ストレージを想定し、endpoint/forcePathStyle を環境変数で調整可能にする。
function getClient(): S3Client {
  if (client) return client;

  client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

function bucket(): string {
  return requireEnv("S3_BUCKET");
}

export const s3StorageAdapter: StorageAdapter = {
  driver: "S3",

  async put({ key, body, contentType }: PutObjectParams) {
    const upload = new Upload({
      client: getClient(),
      params: {
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      },
    });
    await upload.done();
  },

  async createReadStream(key: string, range?: RangeOptions) {
    const rangeHeader = range ? `bytes=${range.start}-${range.end ?? ""}` : undefined;
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key, Range: rangeHeader })
    );
    const body = result.Body;
    if (!body || !(body instanceof Readable)) {
      throw new Error(`S3 object body is not readable: ${key}`);
    }
    return body;
  },

  async delete(key: string) {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  },
};
