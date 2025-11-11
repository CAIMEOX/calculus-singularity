import { ViewModel, BoxView } from "./types";

function getPanelStyle() {
  return {
    width: 250,
    backgroundColor: "#1a1a1a",
    textColor: "#cccccc",
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: "14px",
    padding: "15px",
    lineHeight: "1.6",
  };
}

export function createInfoPanel(): HTMLElement {
  const panel = document.createElement("div");
  const panelStyle = getPanelStyle();

  panel.id = "info-panel";
  Object.assign(panel.style, {
    width: `${panelStyle.width}px`,
    backgroundColor: panelStyle.backgroundColor,
    color: panelStyle.textColor,
    fontFamily: panelStyle.fontFamily,
    fontSize: panelStyle.fontSize,
    padding: panelStyle.padding,
    lineHeight: panelStyle.lineHeight,
    height: "100%",
    boxSizing: "border-box",
  });

  return panel;
}

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
      content += "<br>";
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
