import { z } from "zod";
import {
  ColorSchema,
  CoordinateSchema,
  UUIDSchema,
} from "../common/primitives";

export const ConnectionType = z.enum(["straight", "curved", "step"]);
export const ConnectionStyle = z.enum(["solid", "dashed", "dotted"]);

export const ConnectionPointSchema = CoordinateSchema.extend({
  anchor: z.enum(["top", "right", "bottom", "left", "center"]).optional(),
});

export const ConnectionSchema = z
  .object({
    id: UUIDSchema,
    from: UUIDSchema,
    to: UUIDSchema,

    type: ConnectionType.default("curved"),
    color: ColorSchema.default("#6B7280"), // Default gray
    label: z.string().max(100).optional(),
    style: ConnectionStyle.default("solid"),

    fromPoint: ConnectionPointSchema.optional(),
    toPoint: ConnectionPointSchema.optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((conn) => conn.from !== conn.to, {
    message: "Connection cannot be from an item to itself",
  })
  .refine(
    (conn) => {
      if (conn.label) {
        return conn.label.trim().length > 0;
      }
      return true;
    },
    { message: "Connection label cannot be empty" }
  );

export type ConnectionType = z.infer<typeof ConnectionType>;
export type ConnectionStyle = z.infer<typeof ConnectionStyle>;
export type ConnectionPoint = z.infer<typeof ConnectionPointSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;

export const createConnection = (
  from: string,
  to: string,
  options?: Partial<Omit<Connection, "id" | "from" | "to">>
): Connection => {
  return ConnectionSchema.parse({
    id: crypto.randomUUID(),
    from,
    to,
    ...options,
  });
};

export const isValidConnectionPair = (
  fromId: string,
  toId: string,
  existingConnections: Connection[]
): boolean => {
  const exists = existingConnections.some(
    (conn) =>
      (conn.from === fromId && conn.to === toId) ||
      (conn.from === toId && conn.to === fromId)
  );

  return !exists && fromId !== toId;
};
