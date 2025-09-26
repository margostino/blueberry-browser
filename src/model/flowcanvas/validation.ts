import { z } from "zod";
import {
  CaptureRequestSchema,
  ConnectionSchema,
  FlowCanvasSchema,
  FlowItemSchema,
  type CaptureRequest,
  type Connection,
  type FlowCanvas,
  type FlowItem,
} from "./index";

export class ValidationError extends Error {
  public issues: z.ZodIssue[];

  constructor(error: z.ZodError) {
    const formattedErrors = error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");

    super(`Validation failed: ${formattedErrors}`);
    this.name = "ValidationError";
    this.issues = error.errors;
  }
}

export const validateFlowCanvas = (data: unknown): FlowCanvas => {
  const result = FlowCanvasSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
};

export const validateFlowItem = (data: unknown): FlowItem => {
  const result = FlowItemSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
};

export const validateConnection = (data: unknown): Connection => {
  const result = ConnectionSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
};

export const validateCaptureRequest = (data: unknown): CaptureRequest => {
  const result = CaptureRequestSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
};

export const validateFlowItems = (items: unknown[]): FlowItem[] => {
  return items.map((item, index) => {
    try {
      return validateFlowItem(item);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          new z.ZodError(
            error.issues.map((issue) => ({
              ...issue,
              path: [`items[${index}]`, ...issue.path],
            }))
          )
        );
      }
      throw error;
    }
  });
};

export const validateConnections = (connections: unknown[]): Connection[] => {
  return connections.map((conn, index) => {
    try {
      return validateConnection(conn);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          new z.ZodError(
            error.issues.map((issue) => ({
              ...issue,
              path: [`connections[${index}]`, ...issue.path],
            }))
          )
        );
      }
      throw error;
    }
  });
};

export const validatePartialFlowCanvas = (
  data: unknown
): Partial<FlowCanvas> => {
  const result = FlowCanvasSchema.partial().safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
};

export const validatePartialFlowItem = (data: unknown): Partial<FlowItem> => {
  const result = FlowItemSchema.partial().safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
};

export const isValidFlowCanvas = (data: unknown): data is FlowCanvas => {
  return FlowCanvasSchema.safeParse(data).success;
};

export const isValidFlowItem = (data: unknown): data is FlowItem => {
  return FlowItemSchema.safeParse(data).success;
};

export const isValidConnection = (data: unknown): data is Connection => {
  return ConnectionSchema.safeParse(data).success;
};

export const isValidCaptureRequest = (
  data: unknown
): data is CaptureRequest => {
  return CaptureRequestSchema.safeParse(data).success;
};

export const sanitizeFlowCanvas = (data: unknown): FlowCanvas => {
  return FlowCanvasSchema.parse(data);
};

export const sanitizeFlowItem = (data: unknown): FlowItem => {
  return FlowItemSchema.parse(data);
};

export const migrateFlowCanvas = (
  data: any,
  fromVersion: number = 0
): FlowCanvas => {
  if (fromVersion < 1) {
    if (!data.metadata) {
      data.metadata = { version: 1 };
    }
  }

  return validateFlowCanvas(data);
};
