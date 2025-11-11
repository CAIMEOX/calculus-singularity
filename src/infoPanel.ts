import { ViewModel, BoxView, Vector2 } from "./types";
import { generate_panel_content } from "../singularity/target/js/release/build/cs.js";

function getPanelStyle() {
  return {
    width: 250,
    height: 300,
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
    outerHeight: "1000px",
    boxSizing: "border-box",
  });

  return panel;
}

export function updateInfoPanel(
  panelElement: HTMLElement,
  model: ViewModel
): void {
  panelElement.innerHTML = generate_panel_content(model);
}
