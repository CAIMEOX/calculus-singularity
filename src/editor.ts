import {
  load_from_json,
  save_to_json,
  make_wall,
  make_prop_box,
  make_implication_box,
  make_and_box,
  make_pi1_box,
  make_pi2_box,
  make_negation_box,
  make_negation_box_with_inner,
  compose_kind,
  kind_to_label,
  kind_to_string,
} from "../singularity/target/js/release/build/cs.js";
import { styleForKind, unwrapResult } from "./utils.js";
import { Level, LevelBox, LevelInfo, Vector2 } from "./types";

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
const CELL_DATA = "application/x-logic-cell";
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
];

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
interface ModalField {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "number";
  autofocus?: boolean;
}

interface ModalOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  fields: ModalField[];
}

function openFormModal(
  options: ModalOptions
): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const panel = document.createElement("div");
    panel.className = "modal-panel";
    const title = document.createElement("h3");
    title.textContent = options.title;
    panel.appendChild(title);
    if (options.description) {
      const desc = document.createElement("p");
      desc.textContent = options.description;
      panel.appendChild(desc);
    }
    const form = document.createElement("form");
    form.className = "modal-form";
    const inputs: Record<string, HTMLInputElement> = {};
    options.fields.forEach((field, index) => {
      const wrapper = document.createElement("label");
      wrapper.textContent = field.label;
      const input = document.createElement("input");
      input.type = field.type ?? "text";
      input.name = field.name;
      input.placeholder = field.placeholder ?? "";
      if (field.defaultValue !== undefined) {
        input.value = field.defaultValue;
      }
      if (index === 0 || field.autofocus) {
        requestAnimationFrame(() => input.focus());
      }
      inputs[field.name] = input;
      wrapper.appendChild(input);
      form.appendChild(wrapper);
    });
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "secondary";
    cancelBtn.textContent = options.cancelLabel ?? "取消";
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "submit";
    confirmBtn.textContent = options.confirmLabel ?? "确定";
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    form.appendChild(actions);
    panel.appendChild(form);
    overlay.appendChild(panel);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    function close(result: Record<string, string> | null) {
      document.removeEventListener("keydown", onKeyDown);
      document.body.removeChild(overlay);
      resolve(result);
    }
    cancelBtn.addEventListener("click", () => close(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close(null);
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data: Record<string, string> = {};
      options.fields.forEach((field) => {
        data[field.name] = inputs[field.name].value;
      });
      close(data);
    });
    document.body.appendChild(overlay);
  });
}

function createEmptyLevel(): Level {
  return {
    info: {
      id: 1000,
      name: "新关卡",
      description: "",
      gridWidth: 6,
      gridHeight: 6,
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
  const serialized = save_to_json(value);
  const parsed = load_from_json(serialized);
  return unwrapResult(parsed, "load_from_json");
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
  clearSelectedCell();
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

async function handleDrop(tool: ToolId, x: number, y: number) {
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
    const existingGoal = goalAt(x, y);
    const parsed = await promptForKindInput({
      title: "Goal 目标",
      description: "输入逻辑表达式，例如 A & B、A -> !B、fst (A & B)",
      defaultValue: existingGoal ? kind_to_string(existingGoal.prop) : "A",
      confirmLabel: "保存 Goal",
    });
    if (!parsed || parsed.$tag === 0) {
      return;
    }
    pushHistory();
    level.goals = level.goals.filter(
      (goal) => !(goal.pos.x === x && goal.pos.y === y)
    );
    level.goals.push({
      pos: { x, y },
      prop: parsed._0,
    });
    setSelectedCell(x, y);
    renderAll();
    return;
  }
  const existingBox = boxAt(x, y);
  const id = existingBox ? existingBox.id : nextBoxId;
  let allocateNewId = !existingBox;
  let builderResult: LevelBox | null = null;
  switch (tool) {
    case "wall":
      builderResult = make_wall(id, x, y) as LevelBox;
      break;
    case "prop": {
      const label = await promptForTextInput({
        title: "命题块",
        description: "输入命题名称，例如 A、Goal、tmp1",
        label: "命题名称",
        placeholder: "A",
        defaultValue: "A",
        confirmLabel: "放置命题",
      });
      if (!label) {
        return;
      }
      builderResult = make_prop_box(id, x, y, label) as LevelBox;
      break;
    }
    case "implication": {
      const form = await openFormModal({
        title: "蕴涵块",
        description: "填写前件与后件，例如：前件 A，后件 B",
        confirmLabel: "放置蕴涵",
        fields: [
          {
            name: "premise",
            label: "前件",
            placeholder: "A",
            defaultValue: "A",
            autofocus: true,
          },
          {
            name: "conclusion",
            label: "后件",
            placeholder: "B",
            defaultValue: "B",
          },
        ],
      });
      if (!form) {
        return;
      }
      const premise = form.premise?.trim();
      const conclusion = form.conclusion?.trim();
      if (!premise || !conclusion) {
        setStatus("请输入前件与后件", true);
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
      const form = await openFormModal({
        title: "合取块",
        description: "填写左右命题，例如：左侧 A，右侧 B",
        confirmLabel: "放置合取",
        fields: [
          {
            name: "left",
            label: "左侧命题",
            placeholder: "A",
            defaultValue: "A",
            autofocus: true,
          },
          {
            name: "right",
            label: "右侧命题",
            placeholder: "B",
            defaultValue: "B",
          },
        ],
      });
      if (!form) {
        return;
      }
      const left = form.left?.trim();
      const right = form.right?.trim();
      if (!left || !right) {
        setStatus("请输入左右命题", true);
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
      const form = await openFormModal({
        title: "否定块",
        description: "可选输入被否定命题，留空表示通用否定",
        confirmLabel: "放置否定",
        fields: [
          {
            name: "inner",
            label: "被否定的命题（可选）",
            placeholder: "例如 A",
            defaultValue: "",
            autofocus: true,
          },
        ],
      });
      if (!form) {
        return;
      }
      const inner = form.inner?.trim();
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
  if (allocateNewId) {
    nextBoxId = id + 1;
  } else {
    nextBoxId = computeNextBoxId(level.boxes);
  }
  setSelectedCell(x, y);
  setStatus(`放置 ${TOOLBAR.find((t) => t.id === tool)?.label ?? "元素"}`);
  renderAll();
}

async function editBoxAt(x: number, y: number): Promise<boolean> {
  const box = boxAt(x, y);
  if (!box) return false;
  const parsed = await promptForKindInput({
    title: "编辑方块 Kind",
    description: "输入逻辑表达式，例如 A -> B、!(A & B)、fst (A & B)",
    defaultValue: kind_to_string(box.kind),
    confirmLabel: "保存方块",
  });
  if (!parsed || parsed.$tag === 0) {
    return false;
  }
  pushHistory();
  box.kind = parsed._0;
  return true;
}

async function editGoalAt(x: number, y: number): Promise<boolean> {
  const goal = goalAt(x, y);
  if (!goal) return false;
  const parsed = await promptForKindInput({
    title: "编辑 Goal",
    description: "输入逻辑表达式，例如 A、A & B、!fst X",
    defaultValue: kind_to_string(goal.prop),
    confirmLabel: "保存 Goal",
  });
  if (!parsed || parsed.$tag === 0) {
    return false;
  }
  pushHistory();
  goal.prop = parsed._0;
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
        const entityData = event.dataTransfer?.getData(CELL_DATA);
        if (entityData) {
          moveEntity(JSON.parse(entityData), x, y);
          return;
        }
        const data = event.dataTransfer?.getData(TOOL_DATA);
        if (!data) return;
        const tool = data as ToolId;
        void handleDrop(tool, x, y);
      });
      cell.addEventListener("click", () => {
        setSelectedCell(x, y);
      });
      cell.addEventListener("dblclick", () => {
        void (async () => {
          setSelectedCell(x, y);
          if (boxAt(x, y)) {
            if (await editBoxAt(x, y)) {
              renderAll();
              setStatus("已更新方块 Kind");
            }
          } else if (goalAt(x, y)) {
            if (await editGoalAt(x, y)) {
              renderAll();
              setStatus("已更新 Goal");
            }
          } else {
            await handleDrop("player", x, y);
          }
        })();
      });

      const box = boxAt(x, y);
      if (box) {
        const style = styleForKind(box.kind) as {
          fillColor: number;
          borderColor: number;
          symbol: string;
          size: number;
          borderWidth: number;
        };
        style.borderWidth = 2;
        style.size = level.info.cellSize;
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

      const goal = goalAt(x, y);
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

      if (level.player.x === x && level.player.y === y) {
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
  list.className = "toolbar-list";
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

function renderShortcutPanel() {
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "快捷提示";
  panel.appendChild(title);

  const list = document.createElement("ul");
  list.className = "shortcut-list";

  const hints: Array<{ key?: string; text: string }> = [
    { key: "W", text: "可以制造墙壁" },
    { key: "D", text: "快捷删除" },
    { key: "Z", text: "撤销上一次编辑" },
    {
      text: "双击 Box 可以编辑 Kind，使用经典的逻辑符号，例如 A & B, !A, A -> B, fst A, snd B",
    },
  ];

  hints.forEach((hint) => {
    const item = document.createElement("li");
    if (hint.key) {
      const prefix = document.createElement("span");
      prefix.textContent = "按下 ";
      const key = document.createElement("kbd");
      key.className = "shortcut-key";
      key.textContent = hint.key;
      const suffix = document.createElement("span");
      suffix.textContent = ` ${hint.text}`;
      item.appendChild(prefix);
      item.appendChild(key);
      item.appendChild(suffix);
    } else {
      item.textContent = hint.text;
    }
    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

function renderStructurePanel() {
  const panel = document.createElement("div");
  panel.className = "editor-panel";
  const title = document.createElement("h2");
  title.textContent = "结构工具";
  panel.appendChild(title);

  const groups: {
    label: string;
    handler: () => void;
    tone?: "secondary";
  }[][] = [
    [
      { label: "左侧插入列", handler: () => insertColumnRelative("left") },
      { label: "右侧插入列", handler: () => insertColumnRelative("right") },
      { label: "上方插入行", handler: () => insertRowRelative("up") },
      { label: "下方插入行", handler: () => insertRowRelative("down") },
      { label: "删除选中行", handler: deleteSelectedRow, tone: "secondary" },
      { label: "删除选中列", handler: deleteSelectedColumn, tone: "secondary" },
    ],
  ];

  groups.forEach((group) => {
    const row = document.createElement("div");
    row.className = "button-row";
    group.forEach((config) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = config.label;
      if (config.tone === "secondary") {
        btn.classList.add("secondary");
      }
      btn.addEventListener("click", config.handler);
      row.appendChild(btn);
    });
    panel.appendChild(row);
  });

  return panel;
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
      description: metadataInputs.description?.value || level.info.description,
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
      if (!parsed || parsed.$tag === 0) {
        throw new Error("无效的 Level JSON");
      }
      setLevel(parsed._0 as Level);
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
  if (metadataInputs.description) {
    metadataInputs.description.value = level.info.description;
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

function requireSelectedCell(): Vector2 | null {
  if (!selectedCell) {
    setStatus("请先选中一个格子", true);
    return null;
  }
  return selectedCell;
}

function clampSelectedCellToBounds() {
  if (!selectedCell) {
    return;
  }
  const maxX = level.info.gridWidth - 1;
  const maxY = level.info.gridHeight - 1;
  if (maxX < 0 || maxY < 0) {
    selectedCell = null;
    return;
  }
  const clampedX = Math.min(Math.max(selectedCell.x, 0), maxX);
  const clampedY = Math.min(Math.max(selectedCell.y, 0), maxY);
  selectedCell = { x: clampedX, y: clampedY };
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
  pushHistory();
  renderAll();
  setStatus("已删除选中节点");
}

async function editSelectedCell() {
  if (!selectedCell) {
    setStatus("请选择要编辑的节点", true);
    return;
  }
  const { x, y } = selectedCell;
  if (boxAt(x, y)) {
    if (await editBoxAt(x, y)) {
      renderAll();
      setStatus("已编辑选中的方块");
    }
    return;
  }
  if (goalAt(x, y)) {
    if (await editGoalAt(x, y)) {
      renderAll();
      setStatus("已编辑选中的 Goal");
    }
    return;
  }
  setStatus("该格没有可编辑的节点", true);
}

function shiftEntitiesOnAxis(
  axis: "x" | "y",
  index: number,
  delta: number,
  mode: "insert" | "delete"
) {
  const adjustValue = (value: number) => {
    if (mode === "insert") {
      return value >= index ? value + delta : value;
    }
    if (value > index) {
      return value - delta;
    }
    return value;
  };
  const filterPredicate =
    mode === "delete" ? (value: number) => value !== index : () => true;

  level.boxes = level.boxes
    .filter((box) => filterPredicate(box.pos[axis]))
    .map((box) =>
      adjustValue(box.pos[axis]) === box.pos[axis]
        ? box
        : {
            ...box,
            pos: { ...box.pos, [axis]: adjustValue(box.pos[axis]) },
          }
    );
  level.goals = level.goals
    .filter((goal) => filterPredicate(goal.pos[axis]))
    .map((goal) =>
      adjustValue(goal.pos[axis]) === goal.pos[axis]
        ? goal
        : {
            ...goal,
            pos: { ...goal.pos, [axis]: adjustValue(goal.pos[axis]) },
          }
    );

  const playerCoord = level.player[axis];
  if (mode === "insert") {
    if (playerCoord >= index) {
      level.player = { ...level.player, [axis]: playerCoord + delta };
    }
  } else {
    if (playerCoord === index) {
      level.player = { ...level.player, [axis]: Math.max(0, playerCoord - 1) };
    } else if (playerCoord > index) {
      level.player = { ...level.player, [axis]: playerCoord - delta };
    }
  }
}

function insertColumnAt(index: number): boolean {
  if (index < 0 || index > level.info.gridWidth) {
    setStatus("无法在该位置插入列", true);
    return false;
  }
  pushHistory();
  shiftEntitiesOnAxis("x", index, 1, "insert");
  level.info.gridWidth += 1;
  if (selectedCell && selectedCell.x >= index) {
    selectedCell = { x: selectedCell.x + 1, y: selectedCell.y };
  }
  clampSelectedCellToBounds();
  renderAll();
  return true;
}

function insertRowAt(index: number): boolean {
  if (index < 0 || index > level.info.gridHeight) {
    setStatus("无法在该位置插入行", true);
    return false;
  }
  pushHistory();
  shiftEntitiesOnAxis("y", index, 1, "insert");
  level.info.gridHeight += 1;
  if (selectedCell && selectedCell.y >= index) {
    selectedCell = { x: selectedCell.x, y: selectedCell.y + 1 };
  }
  clampSelectedCellToBounds();
  renderAll();
  return true;
}

function deleteColumnAt(index: number): boolean {
  if (level.info.gridWidth <= 1) {
    setStatus("无法再删除列", true);
    return false;
  }
  pushHistory();
  shiftEntitiesOnAxis("x", index, 1, "delete");
  level.info.gridWidth -= 1;
  if (selectedCell) {
    if (selectedCell.x > index) {
      selectedCell = { x: selectedCell.x - 1, y: selectedCell.y };
    } else if (selectedCell.x === index) {
      selectedCell = {
        x: Math.min(selectedCell.x, level.info.gridWidth - 1),
        y: selectedCell.y,
      };
    }
  }
  clampSelectedCellToBounds();
  renderAll();
  return true;
}

function deleteRowAt(index: number): boolean {
  if (level.info.gridHeight <= 1) {
    setStatus("无法再删除行", true);
    return false;
  }
  pushHistory();
  shiftEntitiesOnAxis("y", index, 1, "delete");
  level.info.gridHeight -= 1;
  if (selectedCell) {
    if (selectedCell.y > index) {
      selectedCell = { x: selectedCell.x, y: selectedCell.y - 1 };
    } else if (selectedCell.y === index) {
      selectedCell = {
        x: selectedCell.x,
        y: Math.min(selectedCell.y, level.info.gridHeight - 1),
      };
    }
  }
  clampSelectedCellToBounds();
  renderAll();
  return true;
}

function insertColumnRelative(position: "left" | "right") {
  const cell = requireSelectedCell();
  if (!cell) return;
  const insertIndex = position === "left" ? cell.x : cell.x + 1;
  if (!insertColumnAt(insertIndex)) {
    return;
  }
  setStatus(
    position === "left"
      ? "已在选中格子左侧新增一列"
      : "已在选中格子右侧新增一列"
  );
}

function insertRowRelative(position: "up" | "down") {
  const cell = requireSelectedCell();
  if (!cell) return;
  const insertIndex = position === "up" ? cell.y : cell.y + 1;
  if (!insertRowAt(insertIndex)) {
    return;
  }
  setStatus(
    position === "up" ? "已在选中格子上方新增一行" : "已在选中格子下方新增一行"
  );
}

function deleteSelectedColumn() {
  const cell = requireSelectedCell();
  if (!cell) return;
  if (deleteColumnAt(cell.x)) {
    setStatus("已删除选中列");
  }
}

function deleteSelectedRow() {
  const cell = requireSelectedCell();
  if (!cell) return;
  if (deleteRowAt(cell.y)) {
    setStatus("已删除选中行");
  }
}

function isCellEmpty(x: number, y: number) {
  return (
    !boxAt(x, y) &&
    !goalAt(x, y) &&
    !(level.player.x === x && level.player.y === y)
  );
}

interface DragPayload {
  type: "box" | "goal" | "player";
  x: number;
  y: number;
}

function moveEntity(payload: DragPayload, targetX: number, targetY: number) {
  if (payload.x === targetX && payload.y === targetY) {
    setSelectedCell(targetX, targetY);
    return;
  }
  if (!isCellEmpty(targetX, targetY)) {
    setStatus("目标格已有内容，无法移动", true);
    return;
  }
  switch (payload.type) {
    case "box": {
      const box = boxAt(payload.x, payload.y);
      if (!box) {
        setStatus("未找到该方块", true);
        return;
      }
      pushHistory();
      box.pos = { x: targetX, y: targetY };
      break;
    }
    case "goal": {
      const goal = goalAt(payload.x, payload.y);
      if (!goal) {
        setStatus("未找到该 Goal", true);
        return;
      }
      pushHistory();
      goal.pos = { x: targetX, y: targetY };
      break;
    }
    case "player":
      pushHistory();
      level.player = { x: targetX, y: targetY };
      break;
    default:
      setStatus("无法移动该类型", true);
      return;
  }
  setSelectedCell(targetX, targetY);
  renderAll();
  setStatus("已移动节点");
}

function placeWallShortcut() {
  if (!selectedCell) {
    setStatus("请先选择一个网格", true);
    return;
  }
  const { x, y } = selectedCell;
  if (!isCellEmpty(x, y)) {
    setStatus("该网格已有内容，无法放置 Wall", true);
    return;
  }
  pushHistory();
  const wall = make_wall(nextBoxId++, x, y) as LevelBox;
  level.boxes.push(wall);
  setStatus("已添加 Wall");
  renderAll();
}

interface TextPromptOptions {
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  allowEmpty?: boolean;
}

async function promptForTextInput(
  options: TextPromptOptions
): Promise<string | null> {
  let initial = options.defaultValue ?? "";
  while (true) {
    const result = await openFormModal({
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel,
      fields: [
        {
          name: "value",
          label: options.label,
          placeholder: options.placeholder,
          defaultValue: initial,
          autofocus: true,
        },
      ],
    });
    if (!result) {
      return null;
    }
    const value = result.value?.trim() ?? "";
    if (!value && !options.allowEmpty) {
      setStatus("请输入内容", true);
      initial = "";
      continue;
    }
    return value;
  }
}

interface KindPromptOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

async function promptForKindInput(
  options: KindPromptOptions
): Promise<any | null> {
  let initial = options.defaultValue ?? "";
  while (true) {
    const result = await openFormModal({
      title: options.title,
      description:
        options.description ?? "语法：使用 !、&、->、fst、snd 以及括号组合命题",
      confirmLabel: options.confirmLabel ?? "确定",
      fields: [
        {
          name: "expression",
          label: "逻辑表达式",
          placeholder: "例如 A -> (B & !C)",
          defaultValue: initial,
          autofocus: true,
        },
      ],
    });
    if (!result) {
      return null;
    }
    const expr = result.expression?.trim() ?? "";
    if (!expr) {
      setStatus("请输入逻辑表达式", true);
      initial = "";
      continue;
    }
    try {
      return compose_kind(expr);
    } catch (error) {
      console.error(error);
      setStatus("解析失败，请检查语法", true);
      initial = expr;
    }
  }
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
    void editSelectedCell();
    return;
  }
  if (event.key === "w" || event.key === "W") {
    event.preventDefault();
    placeWallShortcut();
  }
});

function init() {
  const layout = document.createElement("div");
  layout.className = "editor-layout";

  const left = document.createElement("div");
  left.className = "editor-left";
  const metadataPanel = renderMetadataPanel();
  const structurePanel = renderStructurePanel();
  const shortcutPanel = renderShortcutPanel();
  const ioPanel = renderIoPanel();
  left.appendChild(metadataPanel);
  left.appendChild(structurePanel);
  left.appendChild(gridContainer);
  left.appendChild(shortcutPanel);
  left.appendChild(ioPanel);
  left.appendChild(statusLine);

  renderToolbar();

  layout.appendChild(left);
  layout.appendChild(toolbarContainer);
  root?.appendChild(layout);

  renderAll();
}

init();
