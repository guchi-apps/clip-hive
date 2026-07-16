import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import type { PutObjectParams, StorageAdapter } from "./types";

let client: S3Client | undefined;

// R2 / MinIO 等の S3 互換ストレージを想定し、endpoint/forcePathStyle を環境変数で調整可能にする。
function getClient(): S3Client {
  if (client) return client;

  client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

function bucket(): string {
  const value = process.env.S3_BUCKET;
  if (!value) throw new Error("S3_BUCKET is not set");
  return value;
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

  async createReadStream(key: string) {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
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
