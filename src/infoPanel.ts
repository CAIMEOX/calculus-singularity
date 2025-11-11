import { ViewModel, BoxView, Vector2 } from "./types";

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

function getBoxInfo(box: BoxView, onGoal: boolean): string[] {
  const kind =
    box.kind === "wall"
      ? "Wall"
      : `Int${box.value !== undefined ? `(${box.value})` : ""}`;
  return [
    `ID: ${box.id}`,
    `Position: (${box.pos.x}, ${box.pos.y})`,
    `Type: ${kind}`,
    `On Goal: ${onGoal ? "Yes" : "No"}`,
  ];
}

function getHoverStyle(isHovered: boolean): string {
  return isHovered ? "font-weight: bold; color: #00FFFF;" : "";
}

function isOnGoal(box: BoxView, goals: Vector2[]): boolean {
  return goals.some((goal) => goal.x === box.pos.x && goal.y === box.pos.y);
}

function generateBoxInfoHTML(
  box: BoxView,
  isHovered: boolean,
  onGoal: boolean
): string {
  const info = getBoxInfo(box, onGoal);
  const style = getHoverStyle(isHovered);
  return `<div style="${style}">${info.join("<br>")}</div>`;
}

function generatePanelContent(model: ViewModel): string {
  let content = "<h3>INFO</h3><hr>";
  content += `<p>Status: ${
    model.isComplete ? "🎉 Completed" : "In progress"
  }</p>`;
  content += `<p>Goals: ${model.goals.length}</p><hr>`;

  if (model.boxes.length === 0) {
    content += "<p>No boxes in this level.</p>";
  } else {
    model.boxes.forEach((box) => {
      const isHovered = box.id === (model.hoveredBoxId ?? null);
      const onGoal = isOnGoal(box, model.goals);
      content += generateBoxInfoHTML(box, isHovered, onGoal);
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
