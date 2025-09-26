import { FlowCanvas } from "../../types/flowcanvas";
export class FlowCanvasStorage {
  private canvases: Map<string, FlowCanvas> = new Map();
  async saveCanvas(canvas: FlowCanvas): Promise<boolean> {
    try {
      this.canvases.set(canvas.id, { ...canvas });
      return true;
    } catch (error) {
      console.error("Failed to save canvas:", error);
      return false;
    }
  }
  async getCanvas(canvasId: string): Promise<FlowCanvas | null> {
    return this.canvases.get(canvasId) || null;
  }
  async getAllCanvases(): Promise<FlowCanvas[]> {
    return Array.from(this.canvases.values()).sort(
      (a, b) => b.modified - a.modified
    );
  }
  async deleteCanvas(canvasId: string): Promise<boolean> {
    return this.canvases.delete(canvasId);
  }
}
