/**
 * Integration Example: How to use Zod schemas with existing FlowCanvas code
 *
 * This file demonstrates integration points where Zod validation should be applied
 * in the existing FlowCanvas architecture.
 */

import {
  captureToFlowItemData,
  createFlowCanvas,
  createFlowItem,
  validateCaptureRequest,
  validateConnection,
  validateFlowCanvas,
  validateFlowItem,
  validatePartialFlowCanvas,
  ValidationError,
  type CaptureRequest,
  type Connection,
  type FlowCanvas,
  type FlowItem,
} from "./index";

// ============================================
// INTEGRATION POINT 1: FlowCanvasStorage
// ============================================

/**
 * Enhanced FlowCanvasStorage with Zod validation
 * Replace src/main/flowcanvas/FlowCanvasStorage.ts with this approach
 */
export class ValidatedFlowCanvasStorage {
  private canvases: Map<string, FlowCanvas> = new Map();

  async saveCanvas(canvasData: unknown): Promise<boolean> {
    try {
      // Validate before saving
      const canvas = validateFlowCanvas(canvasData);
      this.canvases.set(canvas.id, canvas);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        console.error("Canvas validation failed:", error.issues);
      }
      return false;
    }
  }

  async updateCanvas(canvasId: string, updates: unknown): Promise<boolean> {
    try {
      const existing = this.canvases.get(canvasId);
      if (!existing) return false;

      // Validate partial updates
      const validatedUpdates = validatePartialFlowCanvas(updates);

      // Merge and revalidate complete canvas
      const updated = validateFlowCanvas({
        ...existing,
        ...validatedUpdates,
        modified: Date.now(),
      });

      this.canvases.set(canvasId, updated);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        console.error("Canvas update validation failed:", error.issues);
      }
      return false;
    }
  }

  async getCanvas(canvasId: string): Promise<FlowCanvas | null> {
    return this.canvases.get(canvasId) || null;
  }
}

// ============================================
// INTEGRATION POINT 2: IPC Handlers
// ============================================

/**
 * Enhanced IPC handlers with Zod validation
 * Add to src/main/flowcanvas/FlowCanvasManager.ts setupIPCHandlers()
 */
export const setupValidatedIPCHandlers = (
  ipcMain: any,
  storage: ValidatedFlowCanvasStorage
) => {
  // Create canvas with validation
  ipcMain.handle("flowcanvas:create", async (_event: any, data: unknown) => {
    try {
      const canvas =
        typeof data === "string"
          ? createFlowCanvas(data) // Create new from name
          : validateFlowCanvas(data); // Validate existing data

      await storage.saveCanvas(canvas);
      return { success: true, canvas };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: "Invalid canvas data",
          details: error.issues,
        };
      }
      throw error;
    }
  });

  // Capture item with validation
  ipcMain.handle(
    "flowcanvas:capture",
    async (_event: any, requestData: unknown) => {
      try {
        // Validate capture request
        const captureRequest = validateCaptureRequest(requestData);

        // Convert to FlowItem data
        const itemData = captureToFlowItemData(captureRequest);

        // Create validated FlowItem
        const flowItem = createFlowItem(
          itemData.type,
          itemData.content,
          itemData.source,
          itemData.position,
          itemData.dimensions
        );

        return { success: true, item: flowItem };
      } catch (error) {
        if (error instanceof ValidationError) {
          return {
            success: false,
            error: "Invalid capture request",
            details: error.issues,
          };
        }
        throw error;
      }
    }
  );

  // Update item with validation
  ipcMain.handle(
    "flowcanvas:updateItem",
    async (_event: any, canvasId: string, itemId: string, updates: unknown) => {
      try {
        const canvas = await storage.getCanvas(canvasId);
        if (!canvas) throw new Error("Canvas not found");

        // Find and update item
        const itemIndex = canvas.items.findIndex((item) => item.id === itemId);
        if (itemIndex === -1) throw new Error("Item not found");

        // Validate the updated item
        const updatedItem = validateFlowItem({
          ...canvas.items[itemIndex],
          ...(typeof updates === 'object' && updates !== null ? updates : {}),
        });

        // Update canvas
        canvas.items[itemIndex] = updatedItem;
        canvas.modified = Date.now();

        await storage.saveCanvas(canvas);
        return { success: true, item: updatedItem };
      } catch (error) {
        if (error instanceof ValidationError) {
          return {
            success: false,
            error: "Invalid item update",
            details: error.issues,
          };
        }
        throw error;
      }
    }
  );

  // Add connection with validation
  ipcMain.handle(
    "flowcanvas:addConnection",
    async (_event: any, canvasId: string, connectionData: unknown) => {
      try {
        const canvas = await storage.getCanvas(canvasId);
        if (!canvas) throw new Error("Canvas not found");

        // Validate connection
        const connection = validateConnection(connectionData);

        // Verify referenced items exist
        const itemIds = new Set(canvas.items.map((item) => item.id));
        if (!itemIds.has(connection.from) || !itemIds.has(connection.to)) {
          throw new Error("Connection references non-existent items");
        }

        // Add connection to canvas
        canvas.connections.push(connection);
        canvas.modified = Date.now();

        // Revalidate entire canvas to ensure consistency
        const validatedCanvas = validateFlowCanvas(canvas);
        await storage.saveCanvas(validatedCanvas);

        return { success: true, connection };
      } catch (error) {
        if (error instanceof ValidationError) {
          return {
            success: false,
            error: "Invalid connection",
            details: error.issues,
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  );
};

// ============================================
// INTEGRATION POINT 3: Frontend API Types
// ============================================

/**
 * Type-safe frontend API with Zod inference
 * Use in src/renderer/flowcanvas/
 */
export interface FlowCanvasAPI {
  createCanvas(name: string): Promise<FlowCanvas>;
  loadCanvas(id: string): Promise<FlowCanvas | null>;
  saveCanvas(canvas: FlowCanvas): Promise<boolean>;
  captureItem(request: CaptureRequest): Promise<FlowItem>;
  updateItem(
    canvasId: string,
    itemId: string,
    updates: Partial<FlowItem>
  ): Promise<FlowItem>;
  addConnection(
    canvasId: string,
    from: string,
    to: string,
    options?: Partial<Connection>
  ): Promise<Connection>;
  deleteItem(canvasId: string, itemId: string): Promise<boolean>;
  deleteConnection(canvasId: string, connectionId: string): Promise<boolean>;
}

// ============================================
// INTEGRATION POINT 4: React Context
// ============================================

/**
 * Type-safe React context with Zod types
 * Use in src/renderer/flowcanvas/contexts/
 */
import { createContext, useContext } from "react";

interface FlowCanvasContextType {
  canvas: FlowCanvas | null;
  items: FlowItem[];
  connections: Connection[];

  // Actions with built-in validation
  addItem: (item: unknown) => void;
  updateItem: (id: string, updates: unknown) => void;
  removeItem: (id: string) => void;

  addConnection: (connection: unknown) => void;
  removeConnection: (id: string) => void;

  // Validation state
  validationErrors: ValidationError | null;
}

export const FlowCanvasContext = createContext<FlowCanvasContextType | null>(
  null
);

export const useFlowCanvas = () => {
  const context = useContext(FlowCanvasContext);
  if (!context) {
    throw new Error("useFlowCanvas must be used within FlowCanvasProvider");
  }
  return context;
};

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example: Creating a new canvas programmatically
 */
export const exampleCreateCanvas = () => {
  const canvas = createFlowCanvas("My Workflow", {
    layout: "grid",
    zoom: 1.5,
    metadata: {
      description: "Product research workflow",
      tags: ["research", "product"],
      isPublic: false,
      version: 1,
    },
  });

  return canvas;
};

/**
 * Example: Handling user input with validation
 */
export const exampleHandleUserCapture = async (userInput: any) => {
  try {
    // Validate user input
    const captureRequest = validateCaptureRequest({
      type: userInput.type || "text",
      content: userInput.selectedText || "",
      source: {
        url: window.location.href,
        title: document.title,
      },
      options: {
        autoPosition: true,
        preserveFormatting: userInput.preserveFormatting ?? true,
      },
    });

    // Process validated request
    const flowItem = captureToFlowItemData(captureRequest);
    return { success: true, item: flowItem };
  } catch (error) {
    if (error instanceof ValidationError) {
      // Show user-friendly error messages
      console.error("Validation errors:", error.issues);
      return {
        success: false,
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      };
    }
    throw error;
  }
};
