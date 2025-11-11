export interface Vector2 {
  x: number;
  y: number;
}

export interface BoxView {
  id: number;
  pos: Vector2;
  symbol?: string;
}

export interface ViewModel {
  player: Vector2;
  boxes: BoxView[];
  hoveredBoxId: number | null | undefined;
  gridSize: number;
  cellSize: number;
}

export type Box = BoxView;