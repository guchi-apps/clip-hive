import { z } from "zod";

export const PinSchema = z.string().regex(/^\d{4}$/, "4桁の数字を入力してください");

const tagNamesSchema = z.array(z.string().trim().min(1).max(50)).max(30).optional();

// 未入力(空文字)は null として保存する。タイトルは任意入力のため。
const titleSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null));

export const VideoCommonSchema = z.object({
  title: titleSchema,
  note: z.string().max(2000).optional(),
  durationMinutes: z.number().nonnegative("0以上の数値を入力してください").optional(),
  tags: tagNamesSchema,
});
export type VideoCommon = z.infer<typeof VideoCommonSchema>;

export const CreateUrlVideoSchema = VideoCommonSchema.extend({
  url: z.string().trim().min(1, "URLは必須です").max(2048).url("有効なURLを入力してください"),
});
export type CreateUrlVideo = z.infer<typeof CreateUrlVideoSchema>;

export const UpdateVideoSchema = z.object({
  title: titleSchema,
  note: z.string().max(2000).optional(),
  durationMinutes: z.number().nonnegative("0以上の数値を入力してください").optional().nullable(),
  tags: tagNamesSchema,
  url: z.string().trim().min(1).max(2048).url("有効なURLを入力してください").optional(),
});
export type UpdateVideo = z.infer<typeof UpdateVideoSchema>;
