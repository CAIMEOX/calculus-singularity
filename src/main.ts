import * as PIXI from "pixi.js";
import { BoxStyle, createBox } from "./box";
import { createInfoPanel, updateInfoPanel } from "./infoPanel";
import { BoxView, Vector2, ViewModel } from "./types";
import {
  init_model,
  move_with_key,
  hover_box,
  clear_hover,
  view as moonView,
} from "../singularity/target/js/release/build/cs.js";

type CoreModel = unknown;

interface HoverHandlers {
  onHover: (boxId: number) => void;
  onLeave: () => void;
}

function getColors() {
  return {
    GRID: 0x444444,
    PLAYER_FILL: 0x222233,
    PLAYER_BORDER: 0x00ffff,
    BOX_FILL: 0x332222,
    BOX_BORDER: 0xffa500,
  };
}

function calculatePixelPosition(cellSize: number, gridPos: Vector2): Vector2 {
  return {
    x: gridPos.x * cellSize,
    y: gridPos.y * cellSize,
  };
}

function createPlayerStyle(cellSize: number): BoxStyle {
  const colors = getColors();
  return {
    size: cellSize,
    fillColor: colors.PLAYER_FILL,
    borderColor: colors.PLAYER_BORDER,
    symbol: "λ",
  };
}

function createBoxStyle(cellSize: number): BoxStyle {
  const colors = getColors();
  return {
    size: cellSize,
    fillColor: colors.BOX_FILL,
    borderColor: colors.BOX_BORDER,
    symbol: "5",
  };
}

function calculateBoxOperations(boxes: BoxView[], existingBoxIds: Set<number>) {
  const toCreate: BoxView[] = [];
  const toUpdate: BoxView[] = [];
  const toRemove: number[] = [];

  const currentBoxIds = new Set<number>();

  boxes.forEach((box) => {
    currentBoxIds.add(box.id);
    if (!existingBoxIds.has(box.id)) {
      toCreate.push(box);
    } else {
      toUpdate.push(box);
    }
  });

  for (const id of existingBoxIds) {
    if (!currentBoxIds.has(id)) {
      toRemove.push(id);
    }
  }

  return { toCreate, toUpdate, toRemove };
}

function createGridGraphics(gridSize: number, cellSize: number): PIXI.Graphics {
  const colors = getColors();
  const screenSize = gridSize * cellSize;

  const gridGfx = new PIXI.Graphics();
  gridGfx.lineStyle(1, colors.GRID, 0.5);
  for (let i = 0; i <= gridSize; i++) {
    gridGfx.moveTo(i * cellSize, 0);
    gridGfx.lineTo(i * cellSize, screenSize);
    gridGfx.moveTo(0, i * cellSize);
    gridGfx.lineTo(screenSize, i * cellSize);
  }
  return gridGfx;
}

function createPlayerVisual(cellSize: number): PIXI.Container {
  return createBox(createPlayerStyle(cellSize));
}

function createBoxVisual(cellSize: number): PIXI.Container {
  return createBox(createBoxStyle(cellSize));
}

function mutatePlayerPosition(
  playerVisual: PIXI.Container,
  model: ViewModel
): void {
  const pixelPos = calculatePixelPosition(model.cellSize, model.player);
  playerVisual.x = pixelPos.x;
  playerVisual.y = pixelPos.y;
}

function mutateBoxPositions(
  model: ViewModel,
  boxVisuals: Map<number, PIXI.Container>,
  stage: PIXI.Container
): void {
  const operations = calculateBoxOperations(model.boxes, new Set(boxVisuals.keys()));

  operations.toCreate.forEach((box) => {
    const boxVisual = createBoxVisual(model.cellSize);
    const pixelPos = calculatePixelPosition(model.cellSize, box.pos);
    boxVisual.x = pixelPos.x;
    boxVisual.y = pixelPos.y;
    boxVisuals.set(box.id, boxVisual);
    stage.addChild(boxVisual);
  });

  operations.toUpdate.forEach((box) => {
    const boxVisual = boxVisuals.get(box.id);
    if (boxVisual) {
      const pixelPos = calculatePixelPosition(model.cellSize, box.pos);
      boxVisual.x = pixelPos.x;
      boxVisual.y = pixelPos.y;
    }
  });

  operations.toRemove.forEach((id) => {
    const visual = boxVisuals.get(id);
    if (visual) {
      visual.destroy();
      boxVisuals.delete(id);
    }
  });
}

function mutateHoverEvents(
  boxVisuals: Map<number, PIXI.Container>,
  handlers: HoverHandlers
): void {
  for (const [id, visual] of boxVisuals.entries()) {
    if (!(visual as any).hasHoverListener) {
      visual.interactive = true;
      visual.on("mouseover", () => handlers.onHover(id));
      visual.on("mouseout", () => handlers.onLeave());
      (visual as any).hasHoverListener = true;
    }
  }
}

function createPixiApplication(screenSize: number): PIXI.Application {
  return new PIXI.Application({
    width: screenSize,
    height: screenSize,
    antialias: true,
    backgroundColor: 0x1a1a1a,
  });
}

function setupGameContainer(app: PIXI.Application): HTMLElement {
  const gameContainer = document.getElementById("game-container")!;
  gameContainer.appendChild(app.view as HTMLCanvasElement);

  const infoPanelElement = createInfoPanel();
  gameContainer.appendChild(infoPanelElement);

  return infoPanelElement;
}

function normalizeViewModel(raw: any): ViewModel {
  return {
    player: raw.player,
    boxes: raw.boxes ?? [],
    hoveredBoxId: raw.hoveredBoxId ?? null,
    gridSize: raw.gridSize,
    cellSize: raw.cellSize,
  };
}

function createRenderer(
  app: PIXI.Application,
  gridSize: number,
  cellSize: number
) {
  const gridContainer = new PIXI.Container();
  const boxContainer = new PIXI.Container();
  const playerContainer = new PIXI.Container();
  app.stage.addChild(gridContainer, boxContainer, playerContainer);

  const gridGfx = createGridGraphics(gridSize, cellSize);
  gridContainer.addChild(gridGfx);

  const playerVisual = createPlayerVisual(cellSize);
  playerContainer.addChild(playerVisual);

  const boxVisuals = new Map<number, PIXI.Container>();

  const renderView = (model: ViewModel) => {
    mutatePlayerPosition(playerVisual, model);
    mutateBoxPositions(model, boxVisuals, boxContainer);
  };

  const ensureHoverListeners = (handlers: HoverHandlers) => {
    mutateHoverEvents(boxVisuals, handlers);
  };

  return {
    renderView,
    ensureHoverListeners,
    getBoxVisuals: () => boxVisuals,
  };
}

function main() {
  let coreModel: CoreModel = init_model();
  let currentView: ViewModel = normalizeViewModel(moonView(coreModel));

  const screenSize = currentView.gridSize * currentView.cellSize;
  const app = createPixiApplication(screenSize);
  const infoPanelElement = setupGameContainer(app);
  const renderer = createRenderer(app, currentView.gridSize, currentView.cellSize);

  const hoverHandlers: HoverHandlers = {
    onHover: (boxId: number) => {
      coreModel = hover_box(coreModel, boxId);
      render();
    },
    onLeave: () => {
      coreModel = clear_hover(coreModel);
      render();
    },
  };

  const render = () => {
    currentView = normalizeViewModel(moonView(coreModel));
    renderer.renderView(currentView);
    updateInfoPanel(infoPanelElement, currentView);
    requestAnimationFrame(() => renderer.ensureHoverListeners(hoverHandlers));
  };

  const keyboardHandler = (e: KeyboardEvent) => {
    const nextModel = move_with_key(coreModel, e.key);
    if (nextModel !== coreModel) {
      coreModel = nextModel;
      render();
    }
  };

  window.addEventListener("keydown", keyboardHandler);
  render();
}

main();
