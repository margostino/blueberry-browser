import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('__electronAPI', {
  getPageText: () => {
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        return document.documentElement.innerText || document.body?.innerText || '';
      }
      return '';
    } catch (error) {
      console.error('Error getting page text:', error);
      return '';
    }
  }
});

ipcRenderer.on('get-page-text', () => {
  try {
    const text = document.documentElement?.innerText || document.body?.innerText || '';
    ipcRenderer.send('page-text-response', text);
  } catch (error) {
    ipcRenderer.send('page-text-response', '');
  }
});