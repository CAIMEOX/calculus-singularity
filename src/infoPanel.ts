import {
  ViewModel,
  InfoPanelData,
  InfoPanelLine,
  InfoLineTone,
  Kind,
} from "./types";
import { generate_panel_content } from "../singularity/target/js/release/build/cs.js";
import { styleForKind } from "./utils.js";

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
  const panelData = generate_panel_content(model);
  renderInfoPanel(elements.content, panelData);
}

function renderInfoPanel(container: HTMLElement, data: InfoPanelData): void {
  container.replaceChildren();

  const title = document.createElement("h3");
  title.className = "info-panel__title";
  title.textContent = data.title;
  container.appendChild(title);

  const divider = document.createElement("hr");
  divider.className = "info-panel__divider";
  container.appendChild(divider);

  container.appendChild(renderStats(data));
  container.appendChild(
    renderLineSection("Boxes", data.boxes, "No boxes to show yet.")
  );
  container.appendChild(
    renderLineSection("Goals", data.goals, "No goals defined.")
  );
}

function renderStats(data: InfoPanelData): HTMLElement {
  const wrapper = document.createElement("dl");
  wrapper.className = "info-panel__stats";
  data.stats.forEach((stat) => {
    const row = document.createElement("div");
    row.className = "info-panel__stat";

    const dt = document.createElement("dt");
    dt.className = "info-panel__stat-label";
    dt.textContent = stat.label;

    const dd = document.createElement("dd");
    dd.className = "info-panel__stat-value";
    dd.textContent = stat.value;

    row.appendChild(dt);
    row.appendChild(dd);
    wrapper.appendChild(row);
  });
  return wrapper;
}

function renderLineSection(
  title: string,
  lines: InfoPanelLine[],
  emptyLabel: string
): HTMLElement {
  const section = document.createElement("section");
  section.className = "info-panel__section";

  const header = document.createElement("h4");
  header.className = "info-panel__section-title";
  header.textContent = title;
  section.appendChild(header);

  if (!lines.length) {
    const empty = document.createElement("p");
    empty.className = "info-panel__empty";
    empty.textContent = emptyLabel;
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.className = "info-panel__line-list";

  lines.forEach((line) => {
    const item = document.createElement("li");
    item.className = `info-panel__line info-panel__line--${line.tone}`;
    item.textContent = line.text;
    applyLineColors(item, line);
    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

function applyLineColors(element: HTMLElement, line: InfoPanelLine) {
  const { border, text } = resolveLineColors(line);
  element.style.borderColor = border;
  element.style.color = text;
}

function resolveLineColors(
  line: InfoPanelLine
): { border: string; text: string } {
  if (line.tone === "hovered") {
    return { border: "#ffffff", text: "#ffffff" };
  }
  const colorFromKind = kindBorderColor(line.kind);
  if (colorFromKind) {
    return { border: colorFromKind, text: colorFromKind };
  }
  return toneFallbackColor(line.tone);
}

function kindBorderColor(kind?: Kind | null): string | null {
  if (!kind) {
    return null;
  }
  const { borderColor } = styleForKind(kind);
  return numberToCssHex(borderColor);
}

function toneFallbackColor(
  tone: InfoLineTone
): { border: string; text: string } {
  switch (tone) {
    case "proved":
      return { border: "#4caf50", text: "#4caf50" };
    case "unexpected":
      return { border: "#ff4d4f", text: "#ff4d4f" };
    default:
      return { border: "#ffffff", text: "#ffffff" };
  }
}

function numberToCssHex(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}
