import { z } from "zod";
import {
  ColorSchema,
  CoordinateSchema,
  DimensionsSchema,
  NonEmptyStringSchema,
  TagSchema,
  TimestampSchema,
  URLSchema,
  UUIDSchema,
} from "../common/primitives";

export const FlowItemType = z.enum([
  "text",
  "image",
  "screenshot",
  "note",
  "card",
]);
export type FlowItemType = z.infer<typeof FlowItemType>;

export const FlowItemSourceSchema = z
  .object({
    url: URLSchema,
    title: NonEmptyStringSchema,
    timestamp: TimestampSchema,
  })
  .strict();

export const FlowItemPositionSchema = CoordinateSchema.refine(
  (pos) => pos.x >= 0 && pos.y >= 0,
  { message: "Position coordinates must be non-negative" }
);

export const FlowItemDimensionsSchema = DimensionsSchema.refine(
  (dim) => dim.width <= 10000 && dim.height <= 10000,
  { message: "Dimensions exceed maximum allowed size (10000x10000)" }
).refine((dim) => dim.width >= 10 && dim.height >= 10, {
  message: "Dimensions must be at least 10x10",
});

export const FlowItemSchema = z
  .object({
    id: UUIDSchema,
    type: FlowItemType,
    content: z.string().max(100000, "Content too large"), // 100KB limit
    source: FlowItemSourceSchema,
    position: FlowItemPositionSchema,
    dimensions: FlowItemDimensionsSchema,

    thumbnail: z.string().url().optional(),
    connections: z.array(UUIDSchema).default([]),
    tags: z.array(TagSchema).max(20, "Too many tags").default([]),
    color: ColorSchema.optional(),
  })
  .strict()
  .refine(
    (item) => {
      if (item.type === "image" || item.type === "screenshot") {
        return item.thumbnail !== undefined;
      }
      return true;
    },
    { message: "Image and screenshot items must have thumbnails" }
  )
  .refine(
    (item) => {
      return !item.connections.includes(item.id);
    },
    { message: "Item cannot connect to itself" }
  );

export type FlowItemSource = z.infer<typeof FlowItemSourceSchema>;
export type FlowItemPosition = z.infer<typeof FlowItemPositionSchema>;
export type FlowItemDimensions = z.infer<typeof FlowItemDimensionsSchema>;
export type FlowItem = z.infer<typeof FlowItemSchema>;

export const createFlowItem = (
  type: FlowItemType,
  content: string,
  source: FlowItemSource,
  position: FlowItemPosition,
  dimensions?: Partial<FlowItemDimensions>
): FlowItem => {
  const defaultDimensions = {
    width: type === "card" ? 300 : 200,
    height: type === "card" ? 200 : 150,
  };

  return FlowItemSchema.parse({
    id: crypto.randomUUID(),
    type,
    content,
    source,
    position,
    dimensions: { ...defaultDimensions, ...dimensions },
  });
};
