import { z } from "zod";
import { NonEmptyStringSchema, URLSchema } from "../common/primitives";
import { FlowItemType } from "./flowItem";

export const CaptureType = z.enum(["text", "image", "screenshot"]);

export const CaptureSourceSchema = z
  .object({
    url: URLSchema,
    title: NonEmptyStringSchema,
    favicon: URLSchema.optional(),
    domain: z.string().optional(),
  })
  .strict();

export const CaptureRequestSchema = z
  .object({
    type: CaptureType,
    content: z
      .string()
      .min(1, "Content cannot be empty")
      .max(500000, "Content exceeds maximum size (500KB)"),
    source: CaptureSourceSchema,

    metadata: z
      .object({
        selectionRange: z
          .object({
            start: z.number().int().nonnegative(),
            end: z.number().int().nonnegative(),
          })
          .optional(),
        viewport: z
          .object({
            width: z.number().positive(),
            height: z.number().positive(),
          })
          .optional(),
        userAgent: z.string().optional(),
        referrer: URLSchema.optional(),
        timestamp: z.number().int().positive().optional(),
      })
      .optional(),

    options: z
      .object({
        autoPosition: z.boolean().default(true),
        preserveFormatting: z.boolean().default(true),
        extractLinks: z.boolean().default(false),
        generateThumbnail: z.boolean().default(true),
      })
      .optional(),
  })
  .strict()
  .refine(
    (req) => {
      if (req.type === "screenshot") {
        return (
          req.content.startsWith("data:image/") ||
          req.content.startsWith("http")
        );
      }
      return true;
    },
    { message: "Screenshot content must be a data URL or HTTP URL" }
  )
  .refine(
    (req) => {
      if (req.metadata?.selectionRange) {
        const { start, end } = req.metadata.selectionRange;
        return end >= start;
      }
      return true;
    },
    { message: "Invalid selection range" }
  );

export type CaptureType = z.infer<typeof CaptureType>;
export type CaptureSource = z.infer<typeof CaptureSourceSchema>;
export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;

export const createCaptureRequest = (
  type: CaptureType,
  content: string,
  source: CaptureSource,
  options?: Partial<CaptureRequest["options"]>,
  metadata?: Partial<CaptureRequest["metadata"]>
): CaptureRequest => {
  return CaptureRequestSchema.parse({
    type,
    content,
    source: {
      ...source,
      domain: source.domain || new URL(source.url).hostname,
    },
    options,
    metadata: {
      ...metadata,
      timestamp: metadata?.timestamp || Date.now(),
    },
  });
};

export const captureToFlowItemData = (capture: CaptureRequest) => {
  const itemType =
    capture.type === "text"
      ? "text"
      : capture.type === "image"
        ? "image"
        : "screenshot";

  return {
    type: itemType as z.infer<typeof FlowItemType>,
    content: capture.content,
    source: {
      url: capture.source.url,
      title: capture.source.title,
      timestamp: capture.metadata?.timestamp || Date.now(),
    },
    position: { x: 0, y: 0 },
    dimensions: {
      width: capture.type === "text" ? 300 : 400,
      height: capture.type === "text" ? 200 : 300,
    },
  };
};
