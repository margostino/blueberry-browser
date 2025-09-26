import { electronApp } from "@electron-toolkit/utils";
import { app, BrowserWindow, globalShortcut } from "electron";
import { EventManager } from "./EventManager";
import { FlowCanvasManager } from "./flowcanvas/FlowCanvasManager";
import { AppMenu } from "./Menu";
import { Window } from "./Window";
let mainWindow: Window | null = null;
let eventManager: EventManager | null = null;
let menu: AppMenu | null = null;
let flowCanvasManager: FlowCanvasManager | null = null;
const createWindow = (): Window => {
  flowCanvasManager = new FlowCanvasManager();
  const window = new Window(flowCanvasManager);
  menu = new AppMenu(window);
  eventManager = new EventManager(window);
  return window;
};
app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");
  mainWindow = createWindow();
  const shortcut =
    process.platform === "darwin" ? "Cmd+Shift+F" : "Ctrl+Shift+F";
  const registered = globalShortcut.register(shortcut, () => {
    if (mainWindow) {
      const flowCanvasTab = mainWindow.allTabs.find(
        (tab) =>
          tab.url.includes("flowcanvas") ||
          tab.url.includes("localhost:5173/flowcanvas")
      );
      if (flowCanvasTab) {
        mainWindow.switchActiveTab(flowCanvasTab.id);
      } else {
        const newTab = mainWindow.createTab("blueberry://flowcanvas");
        mainWindow.switchActiveTab(newTab.id);
      }
      mainWindow.window.focus();
    }
  });
  if (!registered) {
    console.warn(`⚠️  Failed to register global shortcut: ${shortcut}`);
  } else {
    console.log(`✅ FlowCanvas keyboard shortcut registered: ${shortcut}`);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  if (eventManager) {
    eventManager.cleanup();
    eventManager = null;
  }
  if (mainWindow) {
    mainWindow = null;
  }
  if (menu) {
    menu = null;
  }
  if (flowCanvasManager) {
    flowCanvasManager = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
