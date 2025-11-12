import { ViewModel } from "./types";
import { generate_panel_content } from "../singularity/target/js/release/build/cs.js";

export interface InfoPanelElements {
  panel: HTMLElement;
  content: HTMLElement;
  loadJsonButton: HTMLButtonElement;
  nextLevelButton: HTMLButtonElement;
}

export function createInfoPanel(): InfoPanelElements {
  const panel = document.createElement("div");
  panel.id = "info-panel";
  panel.className = "info-panel";

  const content = document.createElement("div");
  content.className = "info-panel__content";
  panel.appendChild(content);

  const actions = document.createElement("div");
  actions.className = "info-panel__actions";

  const loadJsonButton = document.createElement("button");
  loadJsonButton.type = "button";
  loadJsonButton.className = "info-panel__button";
  loadJsonButton.textContent = "Load From JSON";
  actions.appendChild(loadJsonButton);

  const openLevelEditorButton = document.createElement("button");
  openLevelEditorButton.type = "button";
  openLevelEditorButton.className = "info-panel__button";
  openLevelEditorButton.textContent = "Open Level Editor";
  openLevelEditorButton.onclick = () => {
    window.open("editor.html", "_blank");
  };
  actions.appendChild(openLevelEditorButton);

  const nextLevelButton = document.createElement("button");
  nextLevelButton.type = "button";
  nextLevelButton.className = "info-panel__button info-panel__button--accent";
  nextLevelButton.textContent = "Next Level";
  nextLevelButton.hidden = true;
  nextLevelButton.disabled = true;
  actions.appendChild(nextLevelButton);

  panel.appendChild(actions);

  return { panel, content, loadJsonButton, nextLevelButton };
}

export function updateInfoPanel(
  elements: InfoPanelElements,
  model: ViewModel
): void {
  elements.content.innerHTML = generate_panel_content(model);
}
