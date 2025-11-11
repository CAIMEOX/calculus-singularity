export interface Vector2 {
  x: number;
  y: number;
}

export interface BoxView {
  id: number;
  pos: Vector2;
  kind: "wall" | "int";
  value?: number | null;
}

export interface ViewModel {
  player: Vector2;
  boxes: BoxView[];
  hoveredBoxId: number | null | undefined;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  goals: Vector2[];
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
