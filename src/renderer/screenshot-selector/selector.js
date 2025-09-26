let isSelecting = false;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;

const overlay = document.getElementById("overlay");
const selection = document.getElementById("selection");
const dimensionInfo = selection.querySelector(".dimension-info");
const controls = document.querySelector(".controls");
const instructions = document.querySelector(".instructions");

document.addEventListener("mousedown", handleMouseDown);
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mouseup", handleMouseUp);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    cancelSelection();
  } else if (e.key === "Enter" && !isSelecting && hasSelection()) {
    captureSelection();
  }
});

function handleMouseDown(e) {
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  selection.classList.add("active");
  controls.classList.add("hidden");
  instructions.style.display = "none";
}

function handleMouseMove(e) {
  if (!isSelecting) return;

  endX = e.clientX;
  endY = e.clientY;

  updateSelection();
}

function handleMouseUp(e) {
  if (!isSelecting) return;

  isSelecting = false;
  endX = e.clientX;
  endY = e.clientY;

  if (hasSelection()) {
    controls.classList.remove("hidden");
  }
}

function updateSelection() {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  selection.style.left = left + "px";
  selection.style.top = top + "px";
  selection.style.width = width + "px";
  selection.style.height = height + "px";

  if (width > 0 && height > 0) {
    dimensionInfo.textContent = `${width} × ${height}`;
  }
}

function hasSelection() {
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return width > 5 && height > 5;
}

async function captureSelection() {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  console.log("📸 Capturing area:", { left, top, width, height });

  if (window.electronAPI && window.electronAPI.captureArea) {
    await window.electronAPI.captureArea({ left, top, width, height });
  }

  window.close();
}

function cancelSelection() {
  console.log("❌ Selection cancelled");
  if (window.electronAPI && window.electronAPI.cancelCapture) {
    window.electronAPI.cancelCapture();
  }
  window.close();
}
