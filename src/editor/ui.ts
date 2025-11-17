import {
  createEmptyLevel,
  EditorState,
  boxAt,
  goalAt,
  clampSelectedCellToBounds,
  ToolDefinition,
  TOOL_DATA,
  CELL_DATA,
} from "./state";
import { save_to_json } from "../../singularity/target/js/release/build/cs.js";
import {
  make_and_box,
  make_implication_box,
  make_negation_box,
  make_negation_box_with_inner,
  make_pi1_box,
  make_pi2_box,
  make_prop_box,
  make_wall,
  kind_to_label,
} from "../../singularity/target/js/release/build/cs.js";
import { styleForKind } from "../utils.js";
import { LevelInfo } from "../types";

export const statusLine = document.createElement("div");
statusLine.className = "status-line";

export const gridContainer = document.createElement("div");
gridContainer.className = "editor-grid editor-panel";

export const toolbarContainer = document.createElement("div");
toolbarContainer.className = "toolbar";

export const jsonInput = document.createElement("textarea");
jsonInput.placeholder = "粘贴 Level JSON...";
export const jsonOutput = document.createElement("textarea");
jsonOutput.readOnly = true;

export const metadataInputs: Partial<Record<keyof LevelInfo, HTMLInputElement>> =
  {};

export function setStatus(text: string, isError = false) {
  statusLine.textContent = text;
  statusLine.style.color = isError ? "#ff7b7b" : "#8fe8ff";
}

export function syncMetadataInputs(state: EditorState) {
  if (!metadataInputs.id) {
    return;
  }
  metadataInputs.id.value = String(state.level.info.id);
  if (metadataInputs.name) {
    metadataInputs.name.value = state.level.info.name;
  }
  if (metadataInputs.gridWidth) {
    metadataInputs.gridWidth.value = String(state.level.info.gridWidth);
  }
  if (metadataInputs.gridHeight) {
    metadataInputs.gridHeight.value = String(state.level.info.gridHeight);
  }
  if (metadataInputs.cellSize) {
    metadataInputs.cellSize.value = String(state.level.info.cellSize);
  }
  if (metadataInputs.description) {
    metadataInputs.description.value = state.level.info.description;
  }
}

export function renderGrid(
  state: EditorState,
  opts: {
    onDrop: (x: number, y: number, data: DataTransfer | null) => void;
    onClick: (x: number, y: number) => void;
    onDoubleClick: (x: number, y: number) => void;
  }
) {
  const cellSize = Math.max(state.level.info.cellSize, 32);
  gridContainer.style.setProperty("--cell-size", `${cellSize}px`);
  gridContainer.style.gridTemplateColumns = `repeat(${state.level.info.gridWidth}, ${cellSize}px)`;
  gridContainer.innerHTML = "";
  for (let y = 0; y < state.level.info.gridHeight; y++) {
    for (let x = 0; x < state.level.info.gridWidth; x++) {
      const cell = document.createElement("div");
      cell.className = "editor-cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      cell.addEventListener("drop", (event) => {
        event.preventDefault();
        opts.onDrop(x, y, event.dataTransfer);
      });
      cell.addEventListener("click", () => opts.onClick(x, y));
      cell.addEventListener("dblclick", () => opts.onDoubleClick(x, y));

      const box = boxAt(state, x, y);
      if (box) {
        const style = styleForKind(box.kind) as {
          fillColor: number;
          borderColor: number;
          symbol: string;
          size: number;
          borderWidth: number;
        };
        style.borderWidth = 2;
        style.size = state.level.info.cellSize;
        const boxNode = document.createElement("div");
        boxNode.className = "editor-box";
        boxNode.style.background = toHex(style.fillColor);
        boxNode.style.border = `2px solid ${toHex(style.borderColor)}`;
        const symbolText =
          typeof style.symbol === "string"
            ? style.symbol
            : style.symbol === undefined || style.symbol === null
            ? ""
            : String(style.symbol);
        boxNode.textContent =
          symbolText.trim().length > 0 ? symbolText : kind_to_label(box.kind);
        boxNode.setAttribute("draggable", "true");
        boxNode.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData(
            CELL_DATA,
            JSON.stringify({ type: "box", x, y })
          );
          event.dataTransfer?.setDragImage(
            boxNode,
            style.size / 2,
            style.size / 2
          );
        });
        cell.appendChild(boxNode);
      }

      const goal = goalAt(state, x, y);
      if (goal) {
        const goalNode = document.createElement("div");
        goalNode.className = "editor-goal";
        goalNode.textContent = kind_to_label(goal.prop);
        goalNode.setAttribute("draggable", "true");
        goalNode.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData(
            CELL_DATA,
            JSON.stringify({ type: "goal", x, y })
          );
          event.dataTransfer?.setDragImage(
            goalNode,
            goalNode.clientWidth / 2,
            goalNode.clientHeight / 2
          );
        });
        cell.appendChild(goalNode);
      }

      if (state.level.player.x === x && state.level.player.y === y) {
        const playerNode = document.createElement("div");
        playerNode.className = "editor-player";
        playerNode.textContent = "λ";
        playerNode.setAttribute("draggable", "true");
        playerNode.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData(
            CELL_DATA,
            JSON.stringify({ type: "player", x, y })
          );
          event.dataTransfer?.setDragImage(playerNode, 10, 10);
        });
        cell.appendChild(playerNode);
      }

      gridContainer.appendChild(cell);
    }
  }
  updateSelectionStyles(state);
}

export function toHex(value: number) {
  return `#${(value >>> 0).toString(16).padStart(6, "0")}`;
}

export function renderToolbar(tools: ToolDefinition[]) {
  toolbarContainer.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "工具箱 (拖动到网格)";
  panel.appendChild(title);
  const list = document.createElement("div");
  list.className = "toolbar-list";
  tools.forEach((tool) => {
    const item = document.createElement("div");
    item.className = "toolbar-item";
    item.draggable = true;
    item.dataset.toolId = tool.id;
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData(TOOL_DATA, tool.id);
    });
    const label = document.createElement("span");
    label.className = "toolbar-item__label";
    label.textContent = tool.label;
    const description = document.createElement("span");
    description.className = "toolbar-item__desc";
    description.textContent = tool.description;
    item.appendChild(label);
    item.appendChild(description);
    list.appendChild(item);
  });
  panel.appendChild(list);
  toolbarContainer.appendChild(panel);
}

export function renderShortcutPanel() {
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "快捷键";
  panel.appendChild(title);

  const shortcuts: { label: string; keys: string }[] = [
    { label: "撤销", keys: "Z" },
    { label: "删除选中", keys: "D" },
    { label: "编辑选中", keys: "E" },
    { label: "快速放置墙", keys: "W" },
  ];
  const list = document.createElement("ul");
  list.className = "shortcut-list";
  shortcuts.forEach((item) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = item.label;
    const keys = document.createElement("span");
    keys.className = "shortcut-keys";
    keys.textContent = item.keys;
    li.appendChild(name);
    li.appendChild(keys);
    list.appendChild(li);
  });
  panel.appendChild(list);
  return panel;
}

export function renderStructurePanel(state: EditorState) {
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "结构编辑";
  panel.appendChild(title);

  const addRow = document.createElement("div");
  addRow.className = "structure-row";
  const addRowLabel = document.createElement("span");
  addRowLabel.textContent = "行";
  const addRowButtons = document.createElement("div");
  addRowButtons.className = "structure-actions";
  const insertRow = (direction: "up" | "down") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = direction === "up" ? "上方 +" : "下方 +";
    btn.dataset.action = `insert-row-${direction}`;
    addRowButtons.appendChild(btn);
  };
  insertRow("up");
  insertRow("down");
  const deleteRow = document.createElement("button");
  deleteRow.type = "button";
  deleteRow.textContent = "删除行";
  deleteRow.dataset.action = "delete-row";
  addRowButtons.appendChild(deleteRow);
  addRow.appendChild(addRowLabel);
  addRow.appendChild(addRowButtons);

  const addCol = document.createElement("div");
  addCol.className = "structure-row";
  const addColLabel = document.createElement("span");
  addColLabel.textContent = "列";
  const addColButtons = document.createElement("div");
  addColButtons.className = "structure-actions";
  const insertCol = (direction: "left" | "right") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = direction === "left" ? "左侧 +" : "右侧 +";
    btn.dataset.action = `insert-col-${direction}`;
    addColButtons.appendChild(btn);
  };
  insertCol("left");
  insertCol("right");
  const deleteCol = document.createElement("button");
  deleteCol.type = "button";
  deleteCol.textContent = "删除列";
  deleteCol.dataset.action = "delete-col";
  addColButtons.appendChild(deleteCol);
  addCol.appendChild(addColLabel);
  addCol.appendChild(addColButtons);

  panel.appendChild(addRow);
  panel.appendChild(addCol);
  return panel;
}

export function renderMetadataPanel(state: EditorState) {
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "关卡信息";
  panel.appendChild(title);
  const form = document.createElement("form");
  form.className = "meta-grid";

  const infoFields: { label: string; key: keyof LevelInfo }[] = [
    { label: "ID", key: "id" },
    { label: "名称", key: "name" },
    { label: "描述", key: "description" },
    { label: "宽度", key: "gridWidth" },
    { label: "高度", key: "gridHeight" },
    { label: "Cell Size", key: "cellSize" },
  ];

  infoFields.forEach((field) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = field.label;
    const input = document.createElement("input");
    input.name = field.key;
    input.value = String(state.level.info[field.key]);
    if (field.key !== "name") {
      input.type = "number";
      input.min = "1";
    }
    metadataInputs[field.key] = input;
    wrapper.appendChild(input);
    form.appendChild(wrapper);
  });

  const buttonRow = document.createElement("div");
  buttonRow.className = "button-row";
  const applyBtn = document.createElement("button");
  applyBtn.type = "submit";
  applyBtn.textContent = "应用";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "secondary";
  resetBtn.textContent = "新建";
  buttonRow.appendChild(applyBtn);
  buttonRow.appendChild(resetBtn);
  form.appendChild(buttonRow);
  panel.appendChild(form);
  return { panel, form, applyBtn, resetBtn };
}

export function renderIoPanel() {
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "导入 / 导出 JSON";
  panel.appendChild(title);

  const loadLabel = document.createElement("label");
  loadLabel.textContent = "粘贴 JSON 并加载";
  panel.appendChild(loadLabel);
  panel.appendChild(jsonInput);

  const buttons = document.createElement("div");
  buttons.className = "button-row";
  const loadBtn = document.createElement("button");
  loadBtn.type = "button";
  loadBtn.textContent = "加载 JSON";
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.textContent = "导出 JSON";
  buttons.appendChild(loadBtn);
  buttons.appendChild(exportBtn);
  panel.appendChild(buttons);

  const exportLabel = document.createElement("label");
  exportLabel.textContent = "导出结果";
  panel.appendChild(exportLabel);
  panel.appendChild(jsonOutput);

  return { panel, loadBtn, exportBtn };
}

export function updateSelectionStyles(state: EditorState) {
  const cells = gridContainer.querySelectorAll(".editor-cell");
  cells.forEach((cell) => {
    const x = Number(cell.getAttribute("data-x"));
    const y = Number(cell.getAttribute("data-y"));
    const isActive =
      state.selectedCell && state.selectedCell.x === x && state.selectedCell.y === y;
    cell.classList.toggle("selected", Boolean(isActive));
  });
}

export function renderAll(
  state: EditorState,
  opts: Parameters<typeof renderGrid>[1]
) {
  syncMetadataInputs(state);
  renderGrid(state, opts);
  jsonOutput.value = save_to_json(state.level);
}
