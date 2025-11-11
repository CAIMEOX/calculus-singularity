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
  gridSize: number;
  cellSize: number;
  goals: Vector2[];
  isComplete: boolean;
}

export type Box = BoxView;
