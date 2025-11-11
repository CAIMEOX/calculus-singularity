export interface Vector2 {
  x: number;
  y: number;
}

export interface BoxView {
  id: number;
  pos: Vector2;
  kind: BoxKind;
  label?: string | null;
  secondary?: string | null;
}

export type BoxKind =
  | "wall"
  | "prop"
  | "implication"
  | "and"
  | "pi1"
  | "pi2";

export interface GoalView {
  pos: Vector2;
  prop: string;
  satisfied: boolean;
}

export interface ViewModel {
  player: Vector2;
  boxes: BoxView[];
  hoveredBoxId: number | null | undefined;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  goals: GoalView[];
  isComplete: boolean;
  levelId: number;
  levelName: string;
}

export type Box = BoxView;

export interface LevelInfo {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
}

export interface LevelBox {
  id: number;
  pos: Vector2;
  kind: any;
}

export interface LevelGoal {
  pos: Vector2;
  prop: any;
}

export interface Level {
  info: LevelInfo;
  player: Vector2;
  boxes: LevelBox[];
  goals: LevelGoal[];
}
