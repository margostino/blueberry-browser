import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('flowCanvasAPI', {
  createCanvas: () => ipcRenderer.invoke('flowcanvas:create'),
  loadCanvas: (canvasId: string) => ipcRenderer.invoke('flowcanvas:load', canvasId),
  saveCanvas: (canvas: any) => ipcRenderer.invoke('flowcanvas:save', canvas),
  getActiveCanvas: () => ipcRenderer.invoke('flowcanvas:get-active'),
  captureItem: (request: any) => ipcRenderer.invoke('flowcanvas:capture-item', request),
  updateItem: (item: any) => ipcRenderer.invoke('flowcanvas:update-item', item),
  deleteItem: (itemId: string) => ipcRenderer.invoke('flowcanvas:delete-item', itemId),
  openCanvas: () => ipcRenderer.invoke('flowcanvas:open'),
  on: (channel: string, callback: Function) => {
    const validChannels = [
      'flowcanvas:item-captured',
      'flowcanvas:canvas-updated',
      'flowcanvas:sync-complete'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  removeListener: (channel: string, callback: Function) => {
    ipcRenderer.removeListener(channel, callback as any);
  }
});
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]): Promise<any> | undefined => {
    const validChannels = [
      'flowcanvas:create',
      'flowcanvas:load',
      'flowcanvas:save',
      'flowcanvas:get-active',
      'flowcanvas:capture-item',
      'flowcanvas:update-item',
      'flowcanvas:delete-item',
      'flowcanvas:open'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return undefined;
  },
  on: (channel: string, callback: Function) => {
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
  removeListener: (channel: string, callback: Function) => {
    ipcRenderer.removeListener(channel, callback as any);
  }
});
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel: string, callback: Function) => {
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