import { z } from "zod";
import {
  TimestampSchema,
  UUIDSchema,
} from "../common/primitives";
import { ConnectionSchema } from "./connection";
import { FlowItemSchema, type FlowItem } from "./flowItem";

export const LayoutType = z.enum(["freeform", "grid", "list"]);

export const ViewportSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  })
  .strict();

export const ZoomSchema = z
  .number()
  .min(0.1, "Zoom cannot be less than 10%")
  .max(5, "Zoom cannot exceed 500%")
  .default(1);

export const FlowCanvasSchema = z
  .object({
    id: UUIDSchema,
    name: z.string().min(1, "Canvas name cannot be empty").max(100, "Canvas name too long"),
    items: z.array(FlowItemSchema).default([]),
    connections: z.array(ConnectionSchema).default([]),

    created: TimestampSchema,
    modified: TimestampSchema,

    zoom: ZoomSchema.optional(),
    viewport: ViewportSchema.optional(),
    layout: LayoutType.default("freeform"),

    metadata: z
      .object({
        description: z.string().max(500).optional(),
        tags: z.array(z.string()).max(10).optional(),
        owner: z.string().optional(),
        isPublic: z.boolean().default(false),
        version: z.number().int().positive().default(1),
      })
      .optional(),
  })
  .strict()
  .refine(
    (canvas) => {
      const itemIds = new Set(canvas.items.map((item) => item.id));
      return canvas.connections.every(
        (conn) => itemIds.has(conn.from) && itemIds.has(conn.to)
      );
    },
    { message: "Connections reference non-existent items" }
  )
  .refine(
    (canvas) => {
      const ids = canvas.items.map((item) => item.id);
      return ids.length === new Set(ids).size;
    },
    { message: "Duplicate item IDs detected" }
  )
  .refine(
    (canvas) => {
      return canvas.modified >= canvas.created;
    },
    { message: "Modified timestamp cannot be before created timestamp" }
  )
  .refine(
    (canvas) => {
      return canvas.items.length <= 1000;
    },
    { message: "Canvas exceeds maximum item limit (1000)" }
  );

export type LayoutType = z.infer<typeof LayoutType>;
export type Viewport = z.infer<typeof ViewportSchema>;
export type FlowCanvas = z.infer<typeof FlowCanvasSchema>;

export const createFlowCanvas = (
  name: string,
  options?: Partial<Omit<FlowCanvas, "id" | "name" | "created" | "modified">>
): FlowCanvas => {
  const now = Date.now();
  return FlowCanvasSchema.parse({
    id: crypto.randomUUID(),
    name,
    created: now,
    modified: now,
    ...options,
  });
};

export const getCanvasStats = (canvas: FlowCanvas) => {
  const itemTypes = canvas.items.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    itemCount: canvas.items.length,
    connectionCount: canvas.connections.length,
    itemTypes,
    avgConnectionsPerItem:
      canvas.items.length > 0
        ? (canvas.connections.length * 2) / canvas.items.length
        : 0,
    lastModified: new Date(canvas.modified),
    age: Date.now() - canvas.created,
  };
};

export const mergeCanvases = (
  primary: FlowCanvas,
  secondary: FlowCanvas,
  options?: {
    resolveConflicts?: "primary" | "secondary" | "newest";
    mergeConnections?: boolean;
  }
): FlowCanvas => {
  const { resolveConflicts = "newest", mergeConnections = true } =
    options || {};

  const itemMap = new Map<string, FlowItem>();

  [...secondary.items, ...primary.items].forEach((item) => {
    const existing = itemMap.get(item.id);
    if (!existing) {
      itemMap.set(item.id, item);
    } else if (resolveConflicts === "primary") {
      if (primary.items.find((i) => i.id === item.id)) {
        itemMap.set(item.id, item);
      }
    } else if (resolveConflicts === "secondary") {
      if (secondary.items.find((i) => i.id === item.id)) {
        itemMap.set(item.id, item);
      }
    } else if (resolveConflicts === "newest") {
      const fromPrimary = primary.items.find((i) => i.id === item.id);
      if (fromPrimary && primary.modified > secondary.modified) {
        itemMap.set(item.id, fromPrimary);
      } else {
        itemMap.set(item.id, item);
      }
    }
  });

  const connections = mergeConnections
    ? [...new Set([...primary.connections, ...secondary.connections])]
    : primary.connections;

  return createFlowCanvas(`${primary.name} + ${secondary.name}`, {
    items: Array.from(itemMap.values()),
    connections: connections.filter(
      (conn) => itemMap.has(conn.from) && itemMap.has(conn.to)
    ),
    layout: primary.layout,
    zoom: primary.zoom,
    viewport: primary.viewport,
  });
};
