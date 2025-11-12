import { ViewModel, BoxView, Vector2 } from "./types";
import { generate_panel_content } from "../singularity/target/js/release/build/cs.js";

export function createInfoPanel(): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "info-panel";
  panel.className = "info-panel";
  return panel;
}

export function updateInfoPanel(
  panelElement: HTMLElement,
  model: ViewModel
): void {
  panelElement.innerHTML = generate_panel_content(model);
}
