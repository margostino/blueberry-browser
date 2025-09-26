const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the main process for extracting page text
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

// Listen for text extraction requests from main process
ipcRenderer.on('get-page-text', (event) => {
  try {
    const text = document.documentElement?.innerText || document.body?.innerText || '';
    ipcRenderer.send('page-text-response', text);
  } catch (error) {
    ipcRenderer.send('page-text-response', '');
  }
});