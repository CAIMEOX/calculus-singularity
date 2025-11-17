import {
  load_from_json,
  save_to_json,
} from "../../singularity/target/js/release/build/cs.js";
import { Level, LevelBox, Vector2 } from "../types";

export type ToolId =
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

export const TOOL_DATA = "application/x-logic-tool";
export const CELL_DATA = "application/x-logic-cell";
export const MAX_HISTORY = 50;

export interface EditorState {
  level: Level;
  nextBoxId: number;
  selectedCell: Vector2 | null;
  undoStack: Level[];
}

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
}

export const TOOLBAR: ToolDefinition[] = [
  { id: "player", label: "玩家", description: "将 λ 放置在网格上" },
  { id: "goal", label: "Goal", description: "放置一个命题目标" },
  { id: "wall", label: "Wall", description: "添加不可移动方块" },
  { id: "prop", label: "Prop", description: "原子命题块" },
  { id: "implication", label: "→", description: "蕴涵块 A→B" },
  { id: "and", label: "∧", description: "合取块 A∧B" },
  { id: "pi1", label: "π₁", description: "Eliminator π₁" },
  { id: "pi2", label: "π₂", description: "Eliminator π₂" },
  { id: "neg", label: "¬", description: "否定块" },
  { id: "erase", label: "Erase", description: "删除所在格内容" },
];

export function createEmptyLevel(): Level {
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

export function createInitialState(): EditorState {
  const level = createEmptyLevel();
  return {
    level,
    nextBoxId: computeNextBoxId(level.boxes),
    selectedCell: null,
    undoStack: [],
  };
}

export function computeNextBoxId(boxes: LevelBox[]): number {
  return boxes.reduce((max, box) => Math.max(max, box.id), 0) + 1;
}

export function cloneLevelData(value: Level): Level {
  const serialized = save_to_json(value);
  const parsed = load_from_json(serialized);
  return parsed.$tag === 0 ? value : (parsed._0 as Level);
}

export function clampLevelEntities(state: EditorState) {
  const { gridWidth, gridHeight } = state.level.info;
  state.level.player.x = Math.min(
    Math.max(state.level.player.x, 0),
    gridWidth - 1
  );
  state.level.player.y = Math.min(
    Math.max(state.level.player.y, 0),
    gridHeight - 1
  );
  state.level.boxes = state.level.boxes.filter(
    (box) =>
      box.pos.x >= 0 &&
      box.pos.x < gridWidth &&
      box.pos.y >= 0 &&
      box.pos.y < gridHeight
  );
  state.level.goals = state.level.goals.filter(
    (goal) =>
      goal.pos.x >= 0 &&
      goal.pos.x < gridWidth &&
      goal.pos.y >= 0 &&
      goal.pos.y < gridHeight
  );
}

export function setLevel(state: EditorState, newLevel: Level) {
  state.level = cloneLevelData(newLevel);
  clampLevelEntities(state);
  state.nextBoxId = computeNextBoxId(state.level.boxes);
  state.selectedCell = null;
}

export function pushHistory(state: EditorState) {
  state.undoStack.push(cloneLevelData(state.level));
  if (state.undoStack.length > MAX_HISTORY) {
    state.undoStack.shift();
  }
}

export function undoLastEdit(state: EditorState): Level | null {
  const snapshot = state.undoStack.pop();
  if (!snapshot) {
    return null;
  }
  state.level = cloneLevelData(snapshot);
  clampLevelEntities(state);
  state.nextBoxId = computeNextBoxId(state.level.boxes);
  state.selectedCell = null;
  return state.level;
}

export function boxAt(state: EditorState, x: number, y: number) {
  return state.level.boxes.find((box) => box.pos.x === x && box.pos.y === y);
}

export function goalAt(state: EditorState, x: number, y: number) {
  return state.level.goals.find((goal) => goal.pos.x === x && goal.pos.y === y);
}

export function clearCell(state: EditorState, x: number, y: number) {
  state.level.boxes = state.level.boxes.filter(
    (box) => !(box.pos.x === x && box.pos.y === y)
  );
  state.level.goals = state.level.goals.filter(
    (goal) => !(goal.pos.x === x && goal.pos.y === y)
  );
  if (state.level.player.x === x && state.level.player.y === y) {
    state.level.player = { x: 0, y: 0 };
  }
}

export function setSelectedCell(state: EditorState, x: number, y: number) {
  state.selectedCell = { x, y };
}

export function clearSelectedCell(state: EditorState) {
  state.selectedCell = null;
}

export function requireSelectedCell(
  state: EditorState
): Vector2 | null {
  return state.selectedCell;
}

export function clampSelectedCellToBounds(state: EditorState) {
  if (!state.selectedCell) {
    return;
  }
  const maxX = state.level.info.gridWidth - 1;
  const maxY = state.level.info.gridHeight - 1;
  if (maxX < 0 || maxY < 0) {
    state.selectedCell = null;
    return;
  }
  const clampedX = Math.min(Math.max(state.selectedCell.x, 0), maxX);
  const clampedY = Math.min(Math.max(state.selectedCell.y, 0), maxY);
  state.selectedCell = { x: clampedX, y: clampedY };
}

export function isCellEmpty(state: EditorState, x: number, y: number) {
  return (
    !boxAt(state, x, y) &&
    !goalAt(state, x, y) &&
    !(state.level.player.x === x && state.level.player.y === y)
  );
}

export function shiftEntitiesOnAxis(
  state: EditorState,
  axis: "x" | "y",
  index: number,
  shift: number,
  direction: "insert" | "delete"
) {
  const axisKey = axis === "x" ? "x" : "y";
  const compare = (value: number) =>
    direction === "insert" ? value >= index : value > index;
  const adjust = (value: number) => value + shift;

  state.level.boxes.forEach((box) => {
    if (compare(box.pos[axisKey])) {
      box.pos[axisKey] = adjust(box.pos[axisKey]);
    }
  });
  state.level.goals.forEach((goal) => {
    if (compare(goal.pos[axisKey])) {
      goal.pos[axisKey] = adjust(goal.pos[axisKey]);
    }
  });
  if (compare(state.level.player[axisKey])) {
    state.level.player[axisKey] = adjust(state.level.player[axisKey]);
  }
}

export function insertColumnAt(state: EditorState, index: number): boolean {
  if (index < 0 || index > state.level.info.gridWidth) {
    return false;
  }
  state.level.info.gridWidth += 1;
  shiftEntitiesOnAxis(state, "x", index, 1, "insert");
  clampSelectedCellToBounds(state);
  return true;
}

export function insertRowAt(state: EditorState, index: number): boolean {
  if (index < 0 || index > state.level.info.gridHeight) {
    return false;
  }
  state.level.info.gridHeight += 1;
  shiftEntitiesOnAxis(state, "y", index, 1, "insert");
  clampSelectedCellToBounds(state);
  return true;
}

export function deleteColumnAt(state: EditorState, index: number): boolean {
  if (state.level.info.gridWidth <= 1) {
    return false;
  }
  state.level.info.gridWidth -= 1;
  state.level.boxes = state.level.boxes.filter((box) => box.pos.x !== index);
  state.level.goals = state.level.goals.filter((goal) => goal.pos.x !== index);
  shiftEntitiesOnAxis(state, "x", index, -1, "delete");
  if (state.selectedCell && state.selectedCell.x === index) {
    state.selectedCell = {
      x: Math.min(state.selectedCell.x, state.level.info.gridWidth - 1),
      y: state.selectedCell.y,
    };
  }
  clampSelectedCellToBounds(state);
  return true;
}

export function deleteRowAt(state: EditorState, index: number): boolean {
  if (state.level.info.gridHeight <= 1) {
    return false;
  }
  state.level.info.gridHeight -= 1;
  state.level.boxes = state.level.boxes.filter((box) => box.pos.y !== index);
  state.level.goals = state.level.goals.filter((goal) => goal.pos.y !== index);
  shiftEntitiesOnAxis(state, "y", index, -1, "delete");
  if (state.selectedCell && state.selectedCell.y === index) {
    state.selectedCell = {
      x: state.selectedCell.x,
      y: Math.min(state.selectedCell.y, state.level.info.gridHeight - 1),
    };
  }
  clampSelectedCellToBounds(state);
  return true;
}
