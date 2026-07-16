import { z } from "zod";

const tagNamesSchema = z.array(z.string().trim().min(1).max(50)).max(30).optional();

export const VideoCommonSchema = z.object({
  title: z.string().trim().min(1, "タイトルは必須です").max(200),
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
  title: z.string().trim().min(1).max(200).optional(),
  note: z.string().max(2000).optional(),
  durationMinutes: z.number().nonnegative("0以上の数値を入力してください").optional().nullable(),
  tags: tagNamesSchema,
  url: z.string().trim().min(1).max(2048).url("有効なURLを入力してください").optional(),
});
export type UpdateVideo = z.infer<typeof UpdateVideoSchema>;
