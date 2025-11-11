import { ViewModel, BoxView } from "./types";

// ===================================================================
// ELM ARCHITECTURE - VIEW COMPONENT
// ===================================================================
// This module provides view functions for the info panel component

function getPanelStyle() {
  return {
    width: 250, // Panel width
    backgroundColor: "#1a1a1a",
    textColor: "#cccccc",
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: "14px",
    padding: "15px",
    lineHeight: "1.6",
  };
}

// ===================================================================
// InfoPanel Builder
// ===================================================================
// This function creates and returns an HTML element as the info panel

export function createInfoPanel(): HTMLElement {
  const panel = document.createElement("div");
  const panelStyle = getPanelStyle();

  // Apply styles
  panel.id = "info-panel";
  Object.assign(panel.style, {
    width: `${panelStyle.width}px`,
    backgroundColor: panelStyle.backgroundColor,
    color: panelStyle.textColor,
    fontFamily: panelStyle.fontFamily,
    fontSize: panelStyle.fontSize,
    padding: panelStyle.padding,
    lineHeight: panelStyle.lineHeight,
    height: "100%", // Make it equal height to canvas
    boxSizing: "border-box", // Ensure padding doesn't add to width
  });

  return panel;
}

// ===================================================================
// InfoPanel Updater (View Function)
// ===================================================================
// This is a pure function that doesn't directly modify the DOM.
// It receives the model and updates the panel's visual representation.
// This approach makes testing and logic separation easier.

function getBoxInfo(box: BoxView): string[] {
  const symbol = box.symbol ?? "?";
  return [
    `ID: ${box.id}`,
    `Position: (${box.pos.x}, ${box.pos.y})`,
    `Symbol: ${symbol}`,
  ];
}

function getHoverStyle(isHovered: boolean): string {
  return isHovered ? "font-weight: bold; color: #00FFFF;" : "";
}

function generateBoxInfoHTML(box: BoxView, isHovered: boolean): string {
  const info = getBoxInfo(box);
  const style = getHoverStyle(isHovered);
  return `<div style="${style}">${info.join("<br>")}</div>`;
}

function generatePanelContent(model: ViewModel): string {
  let content = "<h3>INFO</h3><hr>";

  if (model.boxes.length === 0) {
    content += "<p>No boxes in this level.</p>";
  } else {
    model.boxes.forEach((box) => {
      const isHovered = box.id === (model.hoveredBoxId ?? null);
      content += generateBoxInfoHTML(box, isHovered);
      content += "<br>"; // Add some spacing
    });
  }

  return content;
}

export function updateInfoPanel(
  panelElement: HTMLElement,
  model: ViewModel
): void {
  panelElement.innerHTML = generatePanelContent(model);
}
