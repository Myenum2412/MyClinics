import { z } from "zod";

export const uploadWelcomeDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().nullable().optional(),
  data: z.string().optional(), // base64 encoded
});

export type UploadWelcomeDocumentInput = z.infer<typeof uploadWelcomeDocumentSchema>;

export const listWelcomeDocumentsQuerySchema = z.object({
  q: z.string().optional(),
});

export type ListWelcomeDocumentsQuery = z.infer<typeof listWelcomeDocumentsQuerySchema>;