import {
  load_from_json,
  save_to_json,
  make_wall,
  make_prop_box,
  make_implication_box,
  make_and_box,
  make_pi1_box,
  make_pi2_box,
  make_goal,
  make_negation_box,
  make_negation_box_with_inner,
  style_for_kind,
} from "../singularity/target/js/release/build/cs.js";
import { Level, LevelBox, LevelGoal, LevelInfo, Vector2 } from "./types";

type ToolId =
  | "player"
  | "goal"
  | "wall"
  | "prop"
  | "implication"
  | "and"
  | "pi1"
  | "pi2"
  | "neg"
  | "erase";

interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
}

const TOOL_DATA = "application/x-logic-tool";
const TOOLBAR: ToolDefinition[] = [
  { id: "player", label: "玩家", description: "将 λ 放置在网格上" },
  { id: "goal", label: "Goal", description: "放置一个命题目标" },
  { id: "wall", label: "Wall", description: "添加不可移动方块" },
  { id: "prop", label: "Prop", description: "原子命题块" },
  { id: "implication", label: "→", description: "蕴涵块 A→B" },
  { id: "and", label: "∧", description: "合取块 A∧B" },
  { id: "pi1", label: "π₁", description: "Eliminator π₁" },
  { id: "pi2", label: "π₂", description: "Eliminator π₂" },
  { id: "neg", label: "¬", description: "否定块" },
  { id: "erase", label: "删除", description: "清除该格的内容" },
];

const styles = `
.editor-layout {
  display: flex;
  gap: 24px;
  padding: 24px;
  min-height: 100vh;
  box-sizing: border-box;
}
.editor-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.editor-panel {
  background: #1a1a1d;
  border: 1px solid #26262b;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
}
.editor-panel h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
  letter-spacing: 0.05em;
  color: #6cf0ff;
}
.editor-grid {
  display: grid;
  gap: 4px;
  background: #090909;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #2a2a33;
  overflow: auto;
}
.editor-cell {
  background: #141414;
  border: 1px dashed #333;
  width: var(--cell-size, 48px);
  height: var(--cell-size, 48px);
  position: relative;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #f5f5f5;
  font-size: 14px;
  user-select: none;
}
.editor-cell:hover {
  border-color: #5ec2ff;
}
.editor-box {
  position: absolute;
  inset: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  letter-spacing: 0.05em;
  text-shadow: 0 0 4px rgba(0,0,0,0.4);
}
.editor-goal {
  position: absolute;
  bottom: 2px;
  left: 4px;
  right: 4px;
  font-size: 12px;
  text-align: center;
  padding: 1px 2px;
  border-radius: 4px;
  background: rgba(46, 245, 160, 0.25);
  border: 1px solid rgba(46, 245, 160, 0.6);
}
.editor-player {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 18px;
  color: #00d9ff;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.8);
}
.toolbar {
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tool-item {
  border: 1px solid #2f2f36;
  padding: 10px;
  border-radius: 6px;
  background: #1c1c21;
  cursor: grab;
}
.tool-item:active {
  cursor: grabbing;
}
.tool-item strong {
  display: block;
  font-size: 14px;
  color: #fff;
}
.tool-item span {
  font-size: 12px;
  color: #aaa;
}
.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}
.meta-grid label {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: #ccc;
  gap: 4px;
}
.meta-grid input {
  background: #0f0f12;
  border: 1px solid #2b2b32;
  border-radius: 4px;
  padding: 6px 8px;
  color: #fff;
}
.button-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
button {
  border: 1px solid #4e4ef5;
  background: #2c2cff;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}
button.secondary {
  border-color: #3a3a3f;
  background: #242428;
}
textarea {
  width: 100%;
  min-height: 120px;
  background: #050506;
  color: #9fffe0;
  border: 1px solid #1f1f24;
  border-radius: 6px;
  padding: 10px;
  box-sizing: border-box;
  font-family: "Courier New", Courier, monospace;
  font-size: 12px;
}
.status-line {
  font-size: 12px;
  color: #8fe8ff;
}
.editor-cell.selected {
  border-color: #00f0ff;
  box-shadow: 0 0 6px rgba(0, 240, 255, 0.7);
}
`;

const styleTag = document.createElement("style");
styleTag.textContent = styles;
document.head.appendChild(styleTag);

const root = document.getElementById("editor-root");
if (!root) {
  throw new Error("Editor root element not found");
}

let level: Level = createEmptyLevel();
let nextBoxId = 1;
let selectedCell: Vector2 | null = null;
const undoStack: Level[] = [];
const MAX_HISTORY = 50;

const statusLine = document.createElement("div");
statusLine.className = "status-line";

const gridContainer = document.createElement("div");
gridContainer.className = "editor-grid editor-panel";

const toolbarContainer = document.createElement("div");
toolbarContainer.className = "toolbar";

const jsonInput = document.createElement("textarea");
jsonInput.placeholder = "粘贴 Level JSON...";
const jsonOutput = document.createElement("textarea");
jsonOutput.readOnly = true;
const metadataInputs: Partial<Record<keyof LevelInfo, HTMLInputElement>> = {};

function createEmptyLevel(): Level {
  return {
    info: {
      id: 1000,
      name: "新关卡",
      gridWidth: 10,
      gridHeight: 8,
      cellSize: 48,
    },
    player: { x: 0, y: 0 },
    boxes: [],
    goals: [],
  };
}

function computeNextBoxId(boxes: LevelBox[]): number {
  return boxes.reduce((max, box) => Math.max(max, box.id), 0) + 1;
}

function cloneLevelData(value: Level): Level {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function clampLevelEntities() {
  const { gridWidth, gridHeight } = level.info;
  level.player.x = Math.min(Math.max(level.player.x, 0), gridWidth - 1);
  level.player.y = Math.min(Math.max(level.player.y, 0), gridHeight - 1);
  level.boxes = level.boxes.filter(
    (box) =>
      box.pos.x >= 0 &&
      box.pos.x < gridWidth &&
      box.pos.y >= 0 &&
      box.pos.y < gridHeight
  );
  level.goals = level.goals.filter(
    (goal) =>
      goal.pos.x >= 0 &&
      goal.pos.x < gridWidth &&
      goal.pos.y >= 0 &&
      goal.pos.y < gridHeight
  );
}

function setLevel(newLevel: Level) {
  level = cloneLevelData(newLevel);
  clampLevelEntities();
  nextBoxId = computeNextBoxId(level.boxes);
  syncMetadataInputs();
  renderAll();
  setStatus("已加载关卡");
}

function setStatus(text: string, isError = false) {
  statusLine.textContent = text;
  statusLine.style.color = isError ? "#ff7b7b" : "#8fe8ff";
}

function pushHistory() {
  undoStack.push(cloneLevelData(level));
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
}

function undoLastEdit() {
  const snapshot = undoStack.pop();
  if (!snapshot) {
    setStatus("没有可撤销的操作");
    return;
  }
  level = cloneLevelData(snapshot);
  clampLevelEntities();
  nextBoxId = computeNextBoxId(level.boxes);
  renderAll();
  setStatus("已撤销上一次编辑");
}

function boxAt(x: number, y: number) {
  return level.boxes.find((box) => box.pos.x === x && box.pos.y === y);
}

function goalAt(x: number, y: number) {
  return level.goals.find((goal) => goal.pos.x === x && goal.pos.y === y);
}

function clearCell(x: number, y: number) {
  level.boxes = level.boxes.filter(
    (box) => !(box.pos.x === x && box.pos.y === y)
  );
  level.goals = level.goals.filter(
    (goal) => !(goal.pos.x === x && goal.pos.y === y)
  );
  if (level.player.x === x && level.player.y === y) {
    level.player = { x: 0, y: 0 };
  }
}

function handleDrop(tool: ToolId, x: number, y: number) {
  if (tool === "erase") {
    if (
      !boxAt(x, y) &&
      !goalAt(x, y) &&
      !(level.player.x === x && level.player.y === y)
    ) {
      setSelectedCell(x, y);
      return;
    }
    pushHistory();
    clearCell(x, y);
    setSelectedCell(x, y);
    renderAll();
    return;
  }
  if (tool === "player") {
    if (level.player.x === x && level.player.y === y) {
      setSelectedCell(x, y);
      return;
    }
    pushHistory();
    level.player = { x, y };
    setSelectedCell(x, y);
    renderAll();
    return;
  }
  if (tool === "goal") {
    const prop = prompt("Goal 需要的命题", "A");
    if (!prop) return;
    pushHistory();
    const newGoal = make_goal(x, y, prop) as LevelGoal;
    level.goals = level.goals.filter(
      (goal) => !(goal.pos.x === x && goal.pos.y === y)
    );
    level.goals.push(newGoal);
    setSelectedCell(x, y);
    renderAll();
    return;
  }
  let builderResult: LevelBox | null = null;
  const id = boxAt(x, y)?.id ?? nextBoxId++;
  switch (tool) {
    case "wall":
      builderResult = make_wall(id, x, y) as LevelBox;
      break;
    case "prop": {
      const label = prompt("命题名称", "A");
      if (!label) {
        nextBoxId = Math.max(nextBoxId - 1, 1);
        return;
      }
      builderResult = make_prop_box(id, x, y, label) as LevelBox;
      break;
    }
    case "implication": {
      const premise = prompt("前件 A", "A");
      if (!premise) {
        nextBoxId = Math.max(nextBoxId - 1, 1);
        return;
      }
      const conclusion = prompt("后件 B", "B");
      if (!conclusion) {
        nextBoxId = Math.max(nextBoxId - 1, 1);
        return;
      }
      builderResult = make_implication_box(
        id,
        x,
        y,
        premise,
        conclusion
      ) as LevelBox;
      break;
    }
    case "and": {
      const left = prompt("左侧命题", "A");
      if (!left) {
        nextBoxId = Math.max(nextBoxId - 1, 1);
        return;
      }
      const right = prompt("右侧命题", "B");
      if (!right) {
        nextBoxId = Math.max(nextBoxId - 1, 1);
        return;
      }
      builderResult = make_and_box(id, x, y, left, right) as LevelBox;
      break;
    }
    case "pi1":
      builderResult = make_pi1_box(id, x, y) as LevelBox;
      break;
    case "pi2":
      builderResult = make_pi2_box(id, x, y) as LevelBox;
      break;
    case "neg": {
      const inner = prompt("可选：否定命题", "");
      builderResult = inner
        ? (make_negation_box_with_inner(id, x, y, inner) as LevelBox)
        : (make_negation_box(id, x, y) as LevelBox);
      break;
    }
  }
  if (!builderResult) {
    return;
  }
  pushHistory();
  level.boxes = level.boxes.filter(
    (box) => !(box.pos.x === x && box.pos.y === y)
  );
  level.boxes.push(builderResult);
  nextBoxId = computeNextBoxId(level.boxes);
  setSelectedCell(x, y);
  setStatus(`放置 ${TOOLBAR.find((t) => t.id === tool)?.label ?? "元素"}`);
  renderAll();
}

function kindToLabel(kind: any): string {
  if (!kind) return "";
  switch (kind.$tag) {
    case 0:
      return "Wall";
    case 1:
      return kind._0 ?? "Prop";
    case 2:
      return `${kindToLabel(kind._0)}→${kindToLabel(kind._1)}`;
    case 3:
      return `${kindToLabel(kind._0)}∧${kindToLabel(kind._1)}`;
    case 4:
      return `¬${kind._0 ? `(${kindToLabel(kind._0)})` : ""}`;
    case 5:
      return "π₁";
    case 6:
      return "π₂";
    default:
      return "?";
  }
}

function editBoxAt(x: number, y: number) {
  const box = boxAt(x, y);
  if (!box) return false;
  switch (box.kind?.$tag) {
    case 1: {
      const label = prompt("命题名称", box.kind._0 ?? "A");
      if (!label) return false;
      pushHistory();
      const newBox = make_prop_box(box.id, x, y, label) as LevelBox;
      replaceBox(box, newBox);
      return true;
    }
    case 2: {
      const premise = prompt("前件", kindToLabel(box.kind._0) || "A");
      if (!premise) return false;
      const conclusion = prompt("后件", kindToLabel(box.kind._1) || "B");
      if (!conclusion) return false;
      pushHistory();
      const newBox = make_implication_box(
        box.id,
        x,
        y,
        premise,
        conclusion
      ) as LevelBox;
      replaceBox(box, newBox);
      return true;
    }
    case 3: {
      const left = prompt("左命题", kindToLabel(box.kind._0) || "A");
      if (!left) return false;
      const right = prompt("右命题", kindToLabel(box.kind._1) || "B");
      if (!right) return false;
      pushHistory();
      const newBox = make_and_box(box.id, x, y, left, right) as LevelBox;
      replaceBox(box, newBox);
      return true;
    }
    case 4: {
      const inner = prompt(
        "可选：否定内部命题",
        box.kind._0 ? kindToLabel(box.kind._0) : ""
      );
      pushHistory();
      const newBox = inner
        ? (make_negation_box_with_inner(box.id, x, y, inner) as LevelBox)
        : (make_negation_box(box.id, x, y) as LevelBox);
      replaceBox(box, newBox);
      return true;
    }
    default:
      setStatus("此类型无需编辑");
  }
  return false;
}

function replaceBox(oldBox: LevelBox, newBox: LevelBox) {
  level.boxes = level.boxes.map((box) => (box === oldBox ? newBox : box));
}

function editGoalAt(x: number, y: number) {
  const goal = goalAt(x, y);
  if (!goal) return false;
  const current = kindToLabel(goal.prop);
  const nextLabel = prompt("Goal 命题", current || "A");
  if (!nextLabel) return false;
  pushHistory();
  const newGoal = make_goal(x, y, nextLabel) as LevelGoal;
  level.goals = level.goals.map((g) => (g === goal ? newGoal : g));
  return true;
}

function renderGrid() {
  const cellSize = Math.max(level.info.cellSize, 32);
  gridContainer.style.setProperty("--cell-size", `${cellSize}px`);
  gridContainer.style.gridTemplateColumns = `repeat(${level.info.gridWidth}, ${cellSize}px)`;
  gridContainer.innerHTML = "";
  for (let y = 0; y < level.info.gridHeight; y++) {
    for (let x = 0; x < level.info.gridWidth; x++) {
      const cell = document.createElement("div");
      cell.className = "editor-cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      cell.addEventListener("drop", (event) => {
        event.preventDefault();
        const data = event.dataTransfer?.getData(TOOL_DATA);
        if (!data) return;
        const tool = data as ToolId;
        handleDrop(tool, x, y);
      });
      cell.addEventListener("click", () => {
        setSelectedCell(x, y);
      });
      cell.addEventListener("dblclick", () => {
        setSelectedCell(x, y);
        if (boxAt(x, y)) {
          if (editBoxAt(x, y)) {
            renderAll();
          }
        } else if (goalAt(x, y)) {
          if (editGoalAt(x, y)) {
            renderAll();
          }
        } else {
          handleDrop("player", x, y);
        }
      });

      const box = boxAt(x, y);
      if (box) {
        const style = style_for_kind(box.kind, level.info.cellSize);
        const boxNode = document.createElement("div");
        boxNode.className = "editor-box";
        boxNode.style.background = toHex(style.fillColor);
        boxNode.style.border = `2px solid ${toHex(style.borderColor)}`;
        boxNode.textContent =
          style.symbol && style.symbol.trim().length
            ? style.symbol
            : kindToLabel(box.kind);
        cell.appendChild(boxNode);
      }

      const goal = goalAt(x, y);
      if (goal) {
        const goalNode = document.createElement("div");
        goalNode.className = "editor-goal";
        goalNode.textContent = kindToLabel(goal.prop);
        cell.appendChild(goalNode);
      }

      if (level.player.x === x && level.player.y === y) {
        const playerNode = document.createElement("div");
        playerNode.className = "editor-player";
        playerNode.textContent = "λ";
        cell.appendChild(playerNode);
      }

      if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
        cell.classList.add("selected");
      }

      gridContainer.appendChild(cell);
    }
  }
  updateSelectionStyles();
}

function toHex(value: number) {
  return `#${(value >>> 0).toString(16).padStart(6, "0")}`;
}

function renderToolbar() {
  toolbarContainer.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "工具箱 (拖动到网格)";
  panel.appendChild(title);
  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "8px";
  TOOLBAR.forEach((tool) => {
    const item = document.createElement("div");
    item.className = "tool-item";
    item.setAttribute("draggable", "true");
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData(TOOL_DATA, tool.id);
      event.dataTransfer?.setDragImage(item, 20, 10);
    });
    item.addEventListener("click", () => {
      setStatus(`选择工具：${tool.label}`);
    });
    const strong = document.createElement("strong");
    strong.textContent = tool.label;
    const span = document.createElement("span");
    span.textContent = tool.description;
    item.appendChild(strong);
    item.appendChild(span);
    list.appendChild(item);
  });
  panel.appendChild(list);
  toolbarContainer.appendChild(panel);
}

function renderMetadataPanel() {
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
    { label: "宽度", key: "gridWidth" },
    { label: "高度", key: "gridHeight" },
    { label: "Cell Size", key: "cellSize" },
  ];

  infoFields.forEach((field) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = field.label;
    const input = document.createElement("input");
    input.name = field.key;
    input.value = String(level.info[field.key]);
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    pushHistory();
    level.info = {
      id: Number(metadataInputs.id?.value) || level.info.id,
      name: metadataInputs.name?.value || level.info.name,
      gridWidth: Math.max(
        1,
        Number(metadataInputs.gridWidth?.value) || level.info.gridWidth
      ),
      gridHeight: Math.max(
        1,
        Number(metadataInputs.gridHeight?.value) || level.info.gridHeight
      ),
      cellSize: Math.max(
        20,
        Number(metadataInputs.cellSize?.value) || level.info.cellSize
      ),
    };
    clampLevelEntities();
    renderAll();
    setStatus("已更新关卡信息");
  });

  resetBtn.addEventListener("click", () => {
    setLevel(createEmptyLevel());
  });

  return panel;
}

function renderIoPanel() {
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

  loadBtn.addEventListener("click", () => {
    try {
      if (!jsonInput.value.trim()) {
        setStatus("请输入 JSON 字符串", true);
        return;
      }
      const parsed = load_from_json(jsonInput.value);
      setLevel(parsed as Level);
      clearSelectedCell();
    } catch (error) {
      console.error(error);
      setStatus("加载 JSON 失败，请检查格式", true);
    }
  });

  exportBtn.addEventListener("click", () => {
    try {
      const payload = save_to_json(level);
      jsonOutput.value = payload;
      navigator.clipboard?.writeText(payload).catch(() => {});
      setStatus("已导出 JSON，并复制到剪贴板");
    } catch (error) {
      console.error(error);
      setStatus("导出失败", true);
    }
  });

  return panel;
}

function renderAll() {
  syncMetadataInputs();
  renderGrid();
  jsonOutput.value = save_to_json(level);
}

function syncMetadataInputs() {
  if (!metadataInputs.id) {
    return;
  }
  metadataInputs.id.value = String(level.info.id);
  if (metadataInputs.name) {
    metadataInputs.name.value = level.info.name;
  }
  if (metadataInputs.gridWidth) {
    metadataInputs.gridWidth.value = String(level.info.gridWidth);
  }
  if (metadataInputs.gridHeight) {
    metadataInputs.gridHeight.value = String(level.info.gridHeight);
  }
  if (metadataInputs.cellSize) {
    metadataInputs.cellSize.value = String(level.info.cellSize);
  }
}

function setSelectedCell(x: number, y: number) {
  selectedCell = { x, y };
  updateSelectionStyles();
}

function clearSelectedCell() {
  selectedCell = null;
  updateSelectionStyles();
}

function updateSelectionStyles() {
  const cells = gridContainer.querySelectorAll(".editor-cell");
  cells.forEach((cell) => {
    const x = Number(cell.getAttribute("data-x"));
    const y = Number(cell.getAttribute("data-y"));
    const isActive =
      selectedCell && selectedCell.x === x && selectedCell.y === y;
    cell.classList.toggle("selected", Boolean(isActive));
  });
}

function deleteSelectedCell() {
  if (!selectedCell) {
    setStatus("请选择要删除的节点", true);
    return;
  }
  const { x, y } = selectedCell;
  const hasBox = boxAt(x, y);
  const hasGoal = goalAt(x, y);
  const hasPlayer = level.player.x === x && level.player.y === y;
  if (!hasBox && !hasGoal && !hasPlayer) {
    setStatus("该格没有可删除的节点", true);
    return;
  }
  pushHistory();
  if (hasBox) {
    level.boxes = level.boxes.filter(
      (box) => !(box.pos.x === x && box.pos.y === y)
    );
  } else if (hasGoal) {
    level.goals = level.goals.filter(
      (goal) => !(goal.pos.x === x && goal.pos.y === y)
    );
  } else if (hasPlayer) {
    level.player = { x: 0, y: 0 };
  }
  renderAll();
  setStatus("已删除选中节点");
}

function editSelectedCell() {
  if (!selectedCell) {
    setStatus("请选择要编辑的节点", true);
    return;
  }
  const { x, y } = selectedCell;
  if (boxAt(x, y)) {
    if (editBoxAt(x, y)) {
      renderAll();
      setStatus("已编辑选中的方块");
    }
    return;
  }
  if (goalAt(x, y)) {
    if (editGoalAt(x, y)) {
      renderAll();
      setStatus("已编辑选中的 Goal");
    }
    return;
  }
  setStatus("该格没有可编辑的节点", true);
}

function isTypingTarget(el: Element | null) {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el as HTMLElement | null)?.isContentEditable
  );
}

window.addEventListener("keydown", (event) => {
  if (isTypingTarget(document.activeElement)) {
    return;
  }
  if (event.key === "z" || event.key === "Z") {
    event.preventDefault();
    undoLastEdit();
    return;
  }
  if (event.key === "d" || event.key === "D") {
    event.preventDefault();
    deleteSelectedCell();
    return;
  }
  if (event.key === "e" || event.key === "E") {
    event.preventDefault();
    editSelectedCell();
  }
});

function init() {
  const layout = document.createElement("div");
  layout.className = "editor-layout";

  const left = document.createElement("div");
  left.className = "editor-left";
  const metadataPanel = renderMetadataPanel();
  const ioPanel = renderIoPanel();
  left.appendChild(metadataPanel);
  left.appendChild(gridContainer);
  left.appendChild(ioPanel);
  left.appendChild(statusLine);

  renderToolbar();

  layout.appendChild(left);
  layout.appendChild(toolbarContainer);
  root.appendChild(layout);

  renderAll();
}

init();
