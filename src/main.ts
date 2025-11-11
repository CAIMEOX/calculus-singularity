import * as PIXI from "pixi.js";
import { createBox } from "./box";
import { createInfoPanel, updateInfoPanel } from "./infoPanel";
import { Vector2, ViewModel } from "./types";
import {
  init_model,
  move_with_key,
  hover_box,
  clear_hover,
  undo,
  view as moonView,
} from "../singularity/target/js/release/build/cs.js";

type CoreModel = unknown;

const COLORS = {
  GRID: 0x444444,
  PLAYER_FILL: 0x222233,
  PLAYER_BORDER: 0x00ffff,
  BOX_FILL: 0x332222,
  BOX_BORDER: 0xffa500,
};

interface HoverHandlers {
  hover: (boxId: number) => void;
  leave: () => void;
}

interface RenderContext {
  boxLayer: PIXI.Container;
  player: PIXI.Container;
}

const toPixels = (cellSize: number, pos: Vector2) => ({
  x: pos.x * cellSize,
  y: pos.y * cellSize,
});

const playerStyle = (cellSize: number) => ({
  size: cellSize,
  fillColor: COLORS.PLAYER_FILL,
  borderColor: COLORS.PLAYER_BORDER,
  symbol: "λ",
});

const boxStyle = (cellSize: number, symbol?: string) => ({
  size: cellSize,
  fillColor: COLORS.BOX_FILL,
  borderColor: COLORS.BOX_BORDER,
  symbol: symbol ?? "5",
});

function drawGrid(stage: PIXI.Container, gridSize: number, cellSize: number) {
  const gfx = new PIXI.Graphics();
  gfx.lineStyle(1, COLORS.GRID, 0.5);
  const size = gridSize * cellSize;
  for (let i = 0; i <= gridSize; i++) {
    gfx.moveTo(i * cellSize, 0);
    gfx.lineTo(i * cellSize, size);
    gfx.moveTo(0, i * cellSize);
    gfx.lineTo(size, i * cellSize);
  }
  stage.addChild(gfx);
}

function renderBoxes(
  layer: PIXI.Container,
  view: ViewModel,
  handlers: HoverHandlers
) {
  layer.removeChildren().forEach((child) => child.destroy());
  view.boxes.forEach((box) => {
    const visual = createBox(boxStyle(view.cellSize, box.symbol));
    const pos = toPixels(view.cellSize, box.pos);
    visual.x = pos.x;
    visual.y = pos.y;
    visual.interactive = true;
    visual.on("mouseover", () => handlers.hover(box.id));
    visual.on("mouseout", () => handlers.leave());
    layer.addChild(visual);
  });
}

function renderPlayer(player: PIXI.Container, view: ViewModel) {
  const pos = toPixels(view.cellSize, view.player);
  player.x = pos.x;
  player.y = pos.y;
}

function renderScene(
  ctx: RenderContext,
  view: ViewModel,
  handlers: HoverHandlers
) {
  renderPlayer(ctx.player, view);
  renderBoxes(ctx.boxLayer, view, handlers);
}

function createRenderer(app: PIXI.Application, view: ViewModel): RenderContext {
  drawGrid(app.stage, view.gridSize, view.cellSize);
  const boxLayer = new PIXI.Container();
  const player = createBox(playerStyle(view.cellSize));
  app.stage.addChild(boxLayer);
  app.stage.addChild(player);
  return { boxLayer, player };
}

function createPixiApplication(side: number) {
  return new PIXI.Application({
    width: side,
    height: side,
    antialias: true,
    backgroundColor: 0x1a1a1a,
    resolution: 2,
    
  });
}

function mount(app: PIXI.Application) {
  const container = document.getElementById("game-container")!;
  container.appendChild(app.view as HTMLCanvasElement);
  const panel = createInfoPanel();
  container.appendChild(panel);
  return panel;
}

function normalizeViewModel(raw: any): ViewModel {
  return {
    player: raw.player,
    boxes: raw.boxes ?? [],
    hoveredBoxId: raw.hoveredBoxId,
    gridSize: raw.gridSize,
    cellSize: raw.cellSize,
  };
}

function main() {
  let coreModel: CoreModel = init_model();
  let viewModel: ViewModel = normalizeViewModel(moonView(coreModel));

  const app = createPixiApplication(viewModel.gridSize * viewModel.cellSize);
  const infoPanel = mount(app);
  const ctx = createRenderer(app, viewModel);

  const handlers: HoverHandlers = {
    hover: (boxId) => {
      coreModel = hover_box(coreModel, boxId);
      render();
    },
    leave: () => {
      coreModel = clear_hover(coreModel);
      render();
    },
  };

  const render = () => {
    viewModel = normalizeViewModel(moonView(coreModel));
    renderScene(ctx, viewModel, handlers);
    updateInfoPanel(infoPanel, viewModel);
  };

  window.addEventListener("keydown", (e) => {
    if (e.key === "z" || e.key === "Z") {
      const next = undo(coreModel);
      if (next !== coreModel) {
        coreModel = next;
        render();
      }
      return;
    }
    const next = move_with_key(coreModel, e.key);
    if (next !== coreModel) {
      coreModel = next;
      render();
    }
  });

  render();
}

main();
