import { z } from "zod";
import type { TiptapDoc } from "@/types";

export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB

/* ------------------------------------------------------------------ auth */

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .max(320, "That email is too long.")
    .email("Enter a valid email address."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required.")
    .max(200, "That password is too long."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------- document */

/** A ProseMirror/Tiptap JSON document. Nodes are only shallowly checked. */
export const tiptapNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    attrs: z.record(z.unknown()).nullish(),
    text: z.string().optional(),
    marks: z.array(z.object({ type: z.string().min(1) }).passthrough()).optional(),
    content: z.array(tiptapNodeSchema).optional(),
  }).passthrough()
);

/**
 * Structural check of a document body: `{ type: "doc", content: [...] }`.
 * The parsed value is narrowed to TiptapDoc for the service layer.
 */
export const tiptapDocSchema = z
  .object({
    type: z.literal("doc", {
      errorMap: () => ({ message: 'Content must be a document with type "doc".' }),
    }),
    content: z.array(tiptapNodeSchema).optional(),
  })
  .passthrough()
  .transform((value) => value as unknown as TiptapDoc);

const titleSchema = z
  .string({ invalid_type_error: "Title must be text." })
  .trim()
  .min(1, "Title cannot be empty.")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const patchDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: tiptapDocSchema.optional(),
    baseVersion: z
      .number({ invalid_type_error: "baseVersion must be a number." })
      .int("baseVersion must be an integer.")
      .positive("baseVersion must be positive.")
      .optional(),
  })
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "Provide at least one of title or content.",
    path: ["title"],
  });

export type PatchDocumentInput = z.infer<typeof patchDocumentSchema>;

export const documentIdSchema = z.string().min(1, "Document id is required.").max(200);

/* ----------------------------------------------------------------- shares */

export const shareRoleSchema = z.enum(["VIEWER", "EDITOR"], {
  errorMap: () => ({ message: "Role must be VIEWER or EDITOR." }),
});

export const createShareSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .max(320, "That email is too long.")
    .email("Enter a valid email address."),
  role: shareRoleSchema,
});

export type CreateShareInput = z.infer<typeof createShareSchema>;

export const updateShareSchema = z.object({
  role: shareRoleSchema,
});

export type UpdateShareInput = z.infer<typeof updateShareSchema>;

/* ----------------------------------------------------------------- import */

export const importFileMetaSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
});
