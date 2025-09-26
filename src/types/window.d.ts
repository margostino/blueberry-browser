import { FlowCanvas, FlowItem, CaptureRequest } from './flowcanvas';
declare global {
  interface Window {
    flowCanvasAPI: {
      createCanvas: () => Promise<FlowCanvas>;
      loadCanvas: (canvasId: string) => Promise<FlowCanvas | null>;
      saveCanvas: (canvas: FlowCanvas) => Promise<boolean>;
      getActiveCanvas: () => Promise<FlowCanvas | null>;
      captureItem: (request: CaptureRequest) => Promise<FlowItem>;
      updateItem: (item: FlowItem) => Promise<boolean>;
      deleteItem: (itemId: string) => Promise<boolean>;
      openCanvas: () => Promise<string>;
      on: (channel: string, callback: Function) => void;
      removeListener: (channel: string, callback: Function) => void;
    };
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: Function) => void;
      removeListener: (channel: string, callback: Function) => void;
    };
  }
}
export {};