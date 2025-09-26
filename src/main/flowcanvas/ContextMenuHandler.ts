import { Menu, MenuItem, WebContents, clipboard } from "electron";
import { FlowCanvasManager } from "./FlowCanvasManager";
import { ScreenshotManager } from "./ScreenshotManager";
import { createLogger } from "../../services/Logger";
const logger = createLogger({ module: 'FlowCanvasContextMenu' });

export class FlowCanvasContextMenuHandler {
  private flowCanvasManager: FlowCanvasManager;
  private screenshotManager: ScreenshotManager;
  constructor(flowCanvasManager: FlowCanvasManager) {
    this.flowCanvasManager = flowCanvasManager;
    this.screenshotManager = new ScreenshotManager(flowCanvasManager);
  }
  setupContextMenu(webContents: WebContents): void {
    webContents.on("context-menu", (_, params) => {
      const menu = new Menu();
      menu.append(
        new MenuItem({
          label: "Capture Full Page to FlowCanvas",
          accelerator: "CmdOrCtrl+Shift+S",
          click: async () => {
            logger.debug("Context menu: Capture Full Screenshot clicked");
            try {
              const image = await webContents.capturePage();
              const dataURL = image.toDataURL();
              logger.debug("Screenshot captured", { size: image.getSize() });
              const captureRequest = {
                type: "screenshot" as const,
                content: dataURL,
                source: {
                  url: params.pageURL,
                  title: webContents.getTitle(),
                },
              };
              const item =
                await this.flowCanvasManager.captureItem(captureRequest);
              logger.info("Screenshot captured successfully", { itemId: item.id });
              webContents.send("flowcanvas:item-added", {
                success: true,
                type: "screenshot",
              });
            } catch (error) {
              logger.error("Failed to capture screenshot", error as Error);
            }
          },
        })
      );
      menu.append(
        new MenuItem({
          label: "Capture Area to FlowCanvas",
          accelerator: "CmdOrCtrl+Shift+A",
          click: async () => {
            logger.debug("🎯 Context menu: Capture Area clicked");
            try {
              await this.screenshotManager.startSelectionMode(webContents);
            } catch (error) {
              logger.error("❌ Failed to start selection mode:", error as Error);
            }
          },
        })
      );
      menu.append(
        new MenuItem({
          label: "Paste Screenshot from Clipboard",
          accelerator: "CmdOrCtrl+Shift+V",
          click: async () => {
            logger.debug("📋 Context menu: Paste from Clipboard clicked");
            try {
              const success = await this.screenshotManager.captureFromClipboard();
              if (success) {
                webContents.send("flowcanvas:item-added", {
                  success: true,
                  type: "screenshot",
                  fromClipboard: true,
                });
              } else {
                logger.debug("📋 No image found in clipboard");
              }
            } catch (error) {
              logger.error("❌ Failed to paste from clipboard:", error as Error);
            }
          },
        })
      );
      menu.append(new MenuItem({ type: "separator" }));
      if (params.selectionText && params.selectionText.trim()) {
        menu.append(
          new MenuItem({
            label: "Add to FlowCanvas",
            accelerator: "CmdOrCtrl+Shift+W",
            click: async () => {
              logger.debug("🖱️ Context menu: Add to FlowCanvas clicked");
              const captureRequest = {
                type: "text" as const,
                content: params.selectionText,
                source: {
                  url: params.pageURL,
                  title: webContents.getTitle(),
                },
              };
              logger.debug("📤 Sending capture request:", {
                type: captureRequest.type,
                contentLength: captureRequest.content.length,
                url: captureRequest.source.url,
              });
              try {
                const item =
                  await this.flowCanvasManager.captureItem(captureRequest);
                logger.debug(`✅ Item captured successfully: ${item.id}`);
                webContents.send("flowcanvas:item-added", {
                  success: true,
                  content: params.selectionText.substring(0, 50) + "...",
                });
              } catch (error) {
                logger.error("❌ Failed to capture item:", error as Error);
              }
            },
          })
        );
        menu.append(new MenuItem({ type: "separator" }));
      }
      if (params.selectionText) {
        menu.append(
          new MenuItem({
            label: "Copy",
            accelerator: "CmdOrCtrl+C",
            click: () => {
              clipboard.writeText(params.selectionText);
            },
          })
        );
      }
      if (params.mediaType === "image" && params.srcURL) {
        menu.append(
          new MenuItem({
            label: "Add Image to FlowCanvas",
            click: async () => {
              logger.debug("🖼️ Context menu: Add Image to FlowCanvas clicked");
              logger.debug(`Image URL: ${params.srcURL}`);
              const captureRequest = {
                type: "image" as const,
                content: params.srcURL,
                source: {
                  url: params.pageURL,
                  title: webContents.getTitle(),
                },
              };
              try {
                const item =
                  await this.flowCanvasManager.captureItem(captureRequest);
                logger.debug(`✅ Image captured successfully: ${item.id}`);
                webContents.send("flowcanvas:item-added", {
                  success: true,
                  type: "image",
                });
              } catch (error) {
                logger.error("❌ Failed to capture image:", error as Error);
              }
            },
          })
        );
        menu.append(new MenuItem({ type: "separator" }));
        menu.append(
          new MenuItem({
            label: "Copy Image URL",
            click: () => {
              clipboard.writeText(params.srcURL);
            },
          })
        );
      }
      if (params.linkURL) {
        menu.append(
          new MenuItem({
            label: "Open Link",
            click: () => {
              webContents.loadURL(params.linkURL);
            },
          })
        );
        menu.append(
          new MenuItem({
            label: "Copy Link",
            click: () => {
              clipboard.writeText(params.linkURL);
            },
          })
        );
        menu.append(new MenuItem({ type: "separator" }));
      }
      menu.append(
        new MenuItem({
          label: "Inspect Element",
          click: () => {
            webContents.inspectElement(params.x, params.y);
          },
        })
      );
      if (menu.items.length > 0) {
        menu.popup();
      }
    });
  }
}
