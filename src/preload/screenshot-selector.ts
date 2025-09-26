import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
  captureArea: (bounds: { left: number; top: number; width: number; height: number }) => {
    return ipcRenderer.invoke('screenshot:capture-area', bounds);
  },
  cancelCapture: () => {
    return ipcRenderer.invoke('screenshot:cancel');
  }
});