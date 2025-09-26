import { contextBridge, ipcRenderer } from 'electron';
import type { FlowCanvasItem, FlowCanvas } from '../types/ipc';
contextBridge.exposeInMainWorld('flowCanvasAPI', {
  createCanvas: () => ipcRenderer.invoke('flowcanvas:create'),
  loadCanvas: (canvasId: string) => ipcRenderer.invoke('flowcanvas:load', canvasId),
  saveCanvas: (canvas: FlowCanvas) => ipcRenderer.invoke('flowcanvas:save', canvas),
  getActiveCanvas: () => ipcRenderer.invoke('flowcanvas:get-active'),
  captureItem: (request: Partial<FlowCanvasItem>) => ipcRenderer.invoke('flowcanvas:capture-item', request),
  updateItem: (item: FlowCanvasItem) => ipcRenderer.invoke('flowcanvas:update-item', item),
  deleteItem: (itemId: string) => ipcRenderer.invoke('flowcanvas:delete-item', itemId),
  openCanvas: () => ipcRenderer.invoke('flowcanvas:open'),
  findConnections: (canvas: FlowCanvas) => ipcRenderer.invoke('flowcanvas:find-connections', canvas),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'flowcanvas:item-captured',
      'flowcanvas:canvas-updated',
      'flowcanvas:sync-complete'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> | undefined => {
    const validChannels = [
      'flowcanvas:create',
      'flowcanvas:load',
      'flowcanvas:save',
      'flowcanvas:get-active',
      'flowcanvas:capture-item',
      'flowcanvas:update-item',
      'flowcanvas:delete-item',
      'flowcanvas:open',
      'flowcanvas:find-connections'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return undefined;
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'flowcanvas:item-captured',
      'flowcanvas:canvas-updated',
      'flowcanvas:sync-complete'
    ];
    if (validChannels.includes(channel)) {
      console.log(`[Preload] Setting up listener for ${channel}`);
      ipcRenderer.on(channel, (event, ...args) => {
        console.log(`[Preload] Received ${channel} event:`, args[0]);
        callback(event, ...args);
      });
    }
  },
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const validChannels = ['flowcanvas:item-captured', 'flowcanvas:canvas-updated'];
      if (validChannels.includes(channel)) {
        console.log(`[Preload/electron] Setting up listener for ${channel}`);
        ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
      }
    },
    removeListener: (channel: string, callback: Function) => {
      ipcRenderer.removeListener(channel, callback as any);
    }
  }
});