import {
  EditorState,
  ToolId,
  boxAt,
  clearCell,
  clearSelectedCell,
  cloneLevelData,
  computeNextBoxId,
  deleteColumnAt,
  deleteRowAt,
  goalAt,
  insertColumnAt,
  insertRowAt,
  isCellEmpty,
  pushHistory,
  requireSelectedCell,
  setLevel,
  setSelectedCell,
  shiftEntitiesOnAxis,
  clampSelectedCellToBounds,
} from "./state";
import {
  make_and_box,
  make_implication_box,
  make_negation_box,
  make_negation_box_with_inner,
  make_pi1_box,
  make_pi2_box,
  make_prop_box,
  make_wall,
  kind_to_string,
  compose_kind,
} from "../../singularity/target/js/release/build/cs.js";
import { promptForKindInput, promptForTextInput } from "./modals";
import { kind_to_label } from "../../singularity/target/js/release/build/cs.js";

export interface ActionDeps {
  state: EditorState;
  setStatus: (text: string, isError?: boolean) => void;
  renderAll: () => void;
  updateSelectionStyles: () => void;
  syncMetadataInputs: () => void;
}

export async function handleDrop(
  deps: ActionDeps,
  tool: ToolId,
  x: number,
  y: number
) {
  const { state, setStatus, renderAll } = deps;
  if (tool === "erase") {
    if (
      !boxAt(state, x, y) &&
      !goalAt(state, x, y) &&
      !(state.level.player.x === x && state.level.player.y === y)
    ) {
      setSelectedCell(state, x, y);
      updateSelectionStyles(deps);
      return;
    }
    pushHistory(state);
    clearCell(state, x, y);
    setSelectedCell(state, x, y);
    updateSelectionStyles(deps);
    renderAll();
    return;
  }
  if (tool === "player") {
    if (state.level.player.x === x && state.level.player.y === y) {
      setSelectedCell(state, x, y);
      updateSelectionStyles(deps);
      return;
    }
    pushHistory(state);
    state.level.player = { x, y };
    setSelectedCell(state, x, y);
    updateSelectionStyles(deps);
    renderAll();
    return;
  }
  if (tool === "goal") {
    const existingGoal = goalAt(state, x, y);
    const parsed = await promptForKindInput(
      {
        title: "Goal 目标",
        description: "输入逻辑表达式，例如 A & B、A -> !B、fst (A & B)",
        defaultValue: existingGoal ? kind_to_string(existingGoal.prop) : "A",
        confirmLabel: "保存 Goal",
      },
      compose_kind,
      setStatus
    );
    if (!parsed || (parsed as any).$tag === 0) {
      return;
    }
    pushHistory(state);
    state.level.goals = state.level.goals.filter(
      (goal) => !(goal.pos.x === x && goal.pos.y === y)
    );
    state.level.goals.push({
      pos: { x, y },
      prop: (parsed as any)._0,
    });
    setSelectedCell(state, x, y);
    updateSelectionStyles(deps);
    renderAll();
    return;
  }
  const existingBox = boxAt(state, x, y);
  const id = existingBox ? existingBox.id : state.nextBoxId;
  let allocateNewId = !existingBox;
  let builderResult = null;
  switch (tool) {
    case "wall":
      builderResult = make_wall(id, x, y) as any;
      break;
    case "prop": {
      const label = await promptForTextInput(
        {
          title: "命题块",
          description: "输入命题名称，例如 A、Goal、tmp1",
          defaultValue: "A",
          confirmLabel: "放置命题",
        },
        setStatus
      );
      if (!label) {
        return;
      }
      builderResult = make_prop_box(id, x, y, label) as any;
      break;
    }
    case "implication": {
      const form = await promptForImplication();
      if (!form) return;
      builderResult = make_implication_box(id, x, y, form.left, form.right) as any;
      break;
    }
    case "and": {
      const form = await promptForAnd();
      if (!form) return;
      builderResult = make_and_box(id, x, y, form.left, form.right) as any;
      break;
    }
    case "pi1":
      builderResult = make_pi1_box(id, x, y) as any;
      break;
    case "pi2":
      builderResult = make_pi2_box(id, x, y) as any;
      break;
    case "neg": {
      const inner = await promptForTextInput(
        {
          title: "否定块",
          description: "可选输入被否定命题，留空表示通用否定",
          defaultValue: "",
          confirmLabel: "放置否定",
          allowEmpty: true,
        },
        setStatus
      );
      if (inner === null) {
        return;
      }
      builderResult = inner
        ? (make_negation_box_with_inner(id, x, y, inner) as any)
        : (make_negation_box(id, x, y) as any);
      break;
    }
  }
  if (!builderResult) {
    return;
  }
  pushHistory(state);
  state.level.boxes = state.level.boxes.filter(
    (box) => !(box.pos.x === x && box.pos.y === y)
  );
  state.level.boxes.push(builderResult);
  if (allocateNewId) {
    state.nextBoxId = id + 1;
  } else {
    state.nextBoxId = computeNextBoxId(state.level.boxes);
  }
  setSelectedCell(state, x, y);
  updateSelectionStyles(deps);
  setStatus(`放置 ${toolLabel(tool)}`);
  renderAll();
}

async function promptForImplication() {
  const { openFormModal } = await import("./modals");
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
  if (!form) return null;
  const premise = form.premise?.trim();
  const conclusion = form.conclusion?.trim();
  if (!premise || !conclusion) {
    return null;
  }
  return { left: premise, right: conclusion };
}

async function promptForAnd() {
  const { openFormModal } = await import("./modals");
  const form = await openFormModal({
    title: "合取块",
    description: "填写左右命题，例如：左 A，右 B",
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
  if (!form) return null;
  const left = form.left?.trim();
  const right = form.right?.trim();
  if (!left || !right) {
    return null;
  }
  return { left, right };
}

export async function editBoxAt(deps: ActionDeps, x: number, y: number) {
  const box = boxAt(deps.state, x, y);
  if (!box) return false;
  const parsed = await promptForKindInput(
    {
      title: "编辑方块 Kind",
      description: "输入逻辑表达式，例如 A -> B、!(A & B)、fst (A & B)",
      defaultValue: kind_to_string(box.kind),
      confirmLabel: "保存方块",
    },
    compose_kind,
    deps.setStatus
  );
  if (!parsed || (parsed as any).$tag === 0) {
    return false;
  }
  pushHistory(deps.state);
  box.kind = (parsed as any)._0;
  return true;
}

export async function editGoalAt(deps: ActionDeps, x: number, y: number) {
  const goal = goalAt(deps.state, x, y);
  if (!goal) return false;
  const parsed = await promptForKindInput(
    {
      title: "编辑 Goal",
      description: "输入逻辑表达式，例如 A、A & B、!fst X",
      defaultValue: kind_to_string(goal.prop),
      confirmLabel: "保存 Goal",
    },
    compose_kind,
    deps.setStatus
  );
  if (!parsed || (parsed as any).$tag === 0) {
    return false;
  }
  pushHistory(deps.state);
  goal.prop = (parsed as any)._0;
  return true;
}

export async function editSelectedCell(deps: ActionDeps) {
  const cell = deps.state.selectedCell;
  if (!cell) {
    deps.setStatus("请选择要编辑的节点", true);
    return;
  }
  const { x, y } = cell;
  if (boxAt(deps.state, x, y)) {
    if (await editBoxAt(deps, x, y)) {
      deps.renderAll();
      deps.setStatus("已编辑选中的方块");
    }
    return;
  }
  if (goalAt(deps.state, x, y)) {
    if (await editGoalAt(deps, x, y)) {
      deps.renderAll();
      deps.setStatus("已编辑选中的 Goal");
    }
    return;
  }
  if (deps.state.level.player.x === x && deps.state.level.player.y === y) {
    const text = await promptForTextInput(
      {
        title: "移动玩家",
        description: "输入新的位置，例如 1,2",
        defaultValue: `${x},${y}`,
      },
      deps.setStatus
    );
    if (!text) return;
    const [nx, ny] = text.split(",").map((v) => Number(v.trim()));
    if (Number.isNaN(nx) || Number.isNaN(ny)) {
      deps.setStatus("请输入有效坐标", true);
      return;
    }
    pushHistory(deps.state);
    deps.state.level.player = { x: nx, y: ny };
    deps.renderAll();
    deps.setStatus("已移动玩家");
  }
}

export function deleteSelectedCell(deps: ActionDeps) {
  const cell = deps.state.selectedCell;
  if (!cell) {
    deps.setStatus("请选择要删除的节点", true);
    return;
  }
  const { x, y } = cell;
  const hasBox = boxAt(deps.state, x, y);
  const hasGoal = goalAt(deps.state, x, y);
  const hasPlayer =
    deps.state.level.player.x === x && deps.state.level.player.y === y;
  if (!hasBox && !hasGoal && !hasPlayer) {
    deps.setStatus("该格没有可删除的节点", true);
    return;
  }
  if (hasBox) {
    deps.state.level.boxes = deps.state.level.boxes.filter(
      (box) => !(box.pos.x === x && box.pos.y === y)
    );
  } else if (hasGoal) {
    deps.state.level.goals = deps.state.level.goals.filter(
      (goal) => !(goal.pos.x === x && goal.pos.y === y)
    );
  } else if (hasPlayer) {
    deps.state.level.player = { x: 0, y: 0 };
  }
  pushHistory(deps.state);
  deps.renderAll();
  deps.setStatus("已删除选中节点");
}

export function moveEntity(
  deps: ActionDeps,
  payload: { type: "box" | "goal" | "player"; x: number; y: number },
  targetX: number,
  targetY: number
) {
  if (payload.x === targetX && payload.y === targetY) {
    setSelectedCell(deps.state, targetX, targetY);
    deps.updateSelectionStyles();
    return;
  }
  if (!isCellEmpty(deps.state, targetX, targetY)) {
    deps.setStatus("目标格已有内容，无法移动", true);
    return;
  }
  switch (payload.type) {
    case "box": {
      const box = boxAt(deps.state, payload.x, payload.y);
      if (!box) {
        deps.setStatus("未找到该方块", true);
        return;
      }
      pushHistory(deps.state);
      box.pos = { x: targetX, y: targetY };
      break;
    }
    case "goal": {
      const goal = goalAt(deps.state, payload.x, payload.y);
      if (!goal) {
        deps.setStatus("未找到该 Goal", true);
        return;
      }
      pushHistory(deps.state);
      goal.pos = { x: targetX, y: targetY };
      break;
    }
    case "player":
      pushHistory(deps.state);
      deps.state.level.player = { x: targetX, y: targetY };
      break;
    default:
      deps.setStatus("无法移动该类型", true);
      return;
  }
  deps.renderAll();
  deps.setStatus("已移动元素");
}

export function insertColumnRelative(
  deps: ActionDeps,
  position: "left" | "right"
) {
  const cell = requireSelectedCell(deps.state);
  if (!cell) {
    deps.setStatus("请先选中一个格子", true);
    return;
  }
  const insertIndex = position === "left" ? cell.x : cell.x + 1;
  if (!insertColumnAt(deps.state, insertIndex)) {
    deps.setStatus("无法新增列", true);
    return;
  }
  deps.setStatus(
    position === "left" ? "已在选中格子左侧新增一列" : "已在选中格子右侧新增一列"
  );
  deps.renderAll();
}

export function insertRowRelative(
  deps: ActionDeps,
  position: "up" | "down"
) {
  const cell = requireSelectedCell(deps.state);
  if (!cell) {
    deps.setStatus("请先选中一个格子", true);
    return;
  }
  const insertIndex = position === "up" ? cell.y : cell.y + 1;
  if (!insertRowAt(deps.state, insertIndex)) {
    deps.setStatus("无法新增行", true);
    return;
  }
  deps.setStatus(
    position === "up" ? "已在选中格子上方新增一行" : "已在选中格子下方新增一行"
  );
  deps.renderAll();
}

export function deleteSelectedColumn(deps: ActionDeps) {
  const cell = requireSelectedCell(deps.state);
  if (!cell) {
    deps.setStatus("请先选中一个格子", true);
    return;
  }
  if (deleteColumnAt(deps.state, cell.x)) {
    deps.setStatus("已删除选中列");
    deps.renderAll();
  } else {
    deps.setStatus("无法删除列", true);
  }
}

export function deleteSelectedRow(deps: ActionDeps) {
  const cell = requireSelectedCell(deps.state);
  if (!cell) {
    deps.setStatus("请先选中一个格子", true);
    return;
  }
  if (deleteRowAt(deps.state, cell.y)) {
    deps.setStatus("已删除选中行");
    deps.renderAll();
  } else {
    deps.setStatus("无法删除行", true);
  }
}

export function placeWallShortcut(deps: ActionDeps) {
  if (!deps.state.selectedCell) {
      deps.setStatus("请先选中一个格子", true);
      return;
  }
  const { x, y } = deps.state.selectedCell;
  void handleDrop(deps, "wall", x, y);
}

export function updateSelectionStyles(deps: ActionDeps) {
  deps.updateSelectionStyles();
}

function toolLabel(tool: ToolId) {
  switch (tool) {
    case "player":
      return "玩家";
    case "goal":
      return "Goal";
    case "wall":
      return "墙";
    case "prop":
      return "命题块";
    case "implication":
      return "蕴涵";
    case "and":
      return "合取";
    case "pi1":
      return "π₁";
    case "pi2":
      return "π₂";
    case "neg":
      return "否定";
    case "erase":
      return "擦除";
    default:
      return "元素";
  }
}
