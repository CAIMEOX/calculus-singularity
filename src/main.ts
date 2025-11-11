import * as PIXI from "pixi.js";
import { createBox } from "./box";
import { createInfoPanel, updateInfoPanel } from "./infoPanel";
import { Vector2, ViewModel, BoxView } from "./types";
import { createBackupPanel, renderBackupPanel } from "./backupPanel";
import {
  init_model,
  move_with_key,
  hover_box,
  clear_hover,
  undo,
  save_backup,
  list_backups,
  restore_backup,
  get_active_backup_meta,
  view as moonView,
} from "../singularity/target/js/release/build/cs.js";

type CoreModel = "core-model-placeholder";

interface BackupMeta {
  id: number;
  parentId: number | null;
  childIds: number[];
  timestamp: number;
}

const COLORS = {
  GRID: 0x444444,
  PLAYER_FILL: 0x222233,
  PLAYER_BORDER: 0x00ffff,
  BOX_FILL: 0x332222,
  BOX_BORDER: 0xffa500,
  WALL_FILL: 0x2c2c2c,
  WALL_BORDER: 0x0f0f0f,
  GOAL: 0x2ef5a0,
  GOAL_COMPLETE: 0xf5d142,
};

const thumbnailStore = new Map<number, string>();
const placeholderThumbnail = createPlaceholderThumbnail();

interface HoverHandlers {
  hover: (boxId: number) => void;
  leave: () => void;
}

interface RenderContext {
  goalLayer: PIXI.Container;
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

const boxStyleFor = (cellSize: number, box: BoxView) => {
  if (box.kind === "wall") {
    return {
      size: cellSize,
      fillColor: COLORS.WALL_FILL,
      borderColor: COLORS.WALL_BORDER,
      symbol: "",
    };
  }
  const label =
    box.value !== undefined && box.value !== null ? `${box.value}` : "∫";
  return {
    size: cellSize,
    fillColor: COLORS.BOX_FILL,
    borderColor: COLORS.BOX_BORDER,
    symbol: label,
  };
};

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
    const visual = createBox(boxStyleFor(view.cellSize, box));
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

function renderGoals(layer: PIXI.Container, view: ViewModel) {
  layer.removeChildren().forEach((child) => child.destroy(true));
  view.goals.forEach((goal) => {
    const gfx = new PIXI.Graphics();
    const color = view.isComplete ? COLORS.GOAL_COMPLETE : COLORS.GOAL;
    gfx.beginFill(color, view.isComplete ? 0.8 : 0.4);
    const offset = view.cellSize * 0.15;
    const size = view.cellSize * 0.7;
    const pixel = toPixels(view.cellSize, goal);
    gfx.drawRoundedRect(pixel.x + offset, pixel.y + offset, size, size, 6);
    gfx.endFill();
    layer.addChild(gfx);
  });
}

function renderScene(
  ctx: RenderContext,
  view: ViewModel,
  handlers: HoverHandlers
) {
  renderGoals(ctx.goalLayer, view);
  renderPlayer(ctx.player, view);
  renderBoxes(ctx.boxLayer, view, handlers);
}

function createRenderer(app: PIXI.Application, view: ViewModel): RenderContext {
  drawGrid(app.stage, view.gridSize, view.cellSize);
  const goalLayer = new PIXI.Container();
  const boxLayer = new PIXI.Container();
  const player = createBox(playerStyle(view.cellSize));
  app.stage.addChild(goalLayer);
  app.stage.addChild(boxLayer);
  app.stage.addChild(player);
  return { goalLayer, boxLayer, player };
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
  container.style.display = "flex";
  container.style.alignItems = "flex-start";
  container.style.gap = "16px";

  const { panel: backupPanel, list: backupList } = createBackupPanel();
  container.appendChild(backupPanel);

  const stageWrapper = document.createElement("div");
  stageWrapper.style.flex = "0 0 auto";
  stageWrapper.appendChild(app.view as HTMLCanvasElement);
  container.appendChild(stageWrapper);

  const panel = createInfoPanel();
  container.appendChild(panel);
  return { infoPanel: panel, backupList };
}

function main() {
  let coreModel: CoreModel = init_model();
  let viewModel: ViewModel = moonView(coreModel);

  const app = createPixiApplication(viewModel.gridSize * viewModel.cellSize);
  const { infoPanel, backupList } = mount(app);
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
    viewModel = moonView(coreModel);
    renderScene(ctx, viewModel, handlers);
    updateInfoPanel(infoPanel, viewModel);
  };

  const getBackupMetas = () => (list_backups(coreModel) ?? []) as BackupMeta[];

  const getActiveBackup = () =>
    (get_active_backup_meta(coreModel) as BackupMeta | undefined) ?? undefined;

  const refreshBackups = () => {
    const metas = getBackupMetas();
    const activeMeta = getActiveBackup();
    const items = metas
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((meta) => ({
        id: String(meta.id),
        timestamp: meta.timestamp,
        thumbnail: thumbnailStore.get(meta.id) ?? placeholderThumbnail,
      }));
    renderBackupPanel(
      backupList,
      items,
      activeMeta ? String(activeMeta.id) : null,
      (id) => {
        const backupId = Number(id);
        coreModel = restore_backup(coreModel, backupId);
        render();
        refreshBackups();
      }
    );
  };

  const saveBackup = () => {
    const thumbnail = captureThumbnail(app);
    coreModel = save_backup(coreModel, Date.now());
    const activeMeta = getActiveBackup();
    if (activeMeta) {
      thumbnailStore.set(activeMeta.id, thumbnail);
    }
    refreshBackups();
  };

  refreshBackups();

  window.addEventListener("keydown", (e) => {
    if (e.key === "z" || e.key === "Z") {
      const next = undo(coreModel);
      if (next !== coreModel) {
        coreModel = next;
        render();
      }
      return;
    }
    if (e.key === "r" || e.key === "R") {
      coreModel = init_model();
      thumbnailStore.clear();
      refreshBackups();
      render();
      return;
    }
    if (e.key === "b" || e.key === "B") {
      saveBackup();
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

function captureThumbnail(app: PIXI.Application): string {
  const source = app.renderer.extract.canvas(app.stage);
  const maxEdge = Math.max(source.width, source.height);
  const targetEdge = 160;
  const scale = targetEdge / maxEdge;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  }
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl;
}

function createPlaceholderThumbnail(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 120;
  canvas.height = 90;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#090909";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1f1f1f";
    ctx.fillRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.strokeStyle = "#333";
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = "#0ff";
    ctx.fillRect(8, canvas.height - 12, canvas.width - 16, 4);
  }
  return canvas.toDataURL("image/png");
}
