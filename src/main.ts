import * as PIXI from "pixi.js";
import { createBox,  } from "./box";
import {
  createInfoPanel,
  updateInfoPanel,
  InfoPanelElements,
} from "./infoPanel";
import { Vector2, ViewModel, LevelInfo, CoreModel } from "./types";
import { createBackupPanel, renderBackupPanel } from "./backupPanel";
import { createMobileControls } from "./mobileControls";
import {
  init_model,
  init_model_for,
  move_with_key,
  hover_box,
  clear_hover,
  undo,
  save_backup,
  list_backups,
  restore_backup,
  get_active_backup_meta,
  level_infos,
  view as moonView,
  kind_to_label,
  load_from_json,
  build_model,
  enpool_level,
} from "../singularity/target/js/release/build/cs.js";
import { COLORS, styleForKind } from "./utils.js";

interface BackupMeta {
  id: number;
  parentId: number | null;
  childIds: number[];
  timestamp: number;
}



const BACKGROUND_MUSIC_SRC = new URL("./assets/ah.mp3", import.meta.url).href;
let backgroundMusic: HTMLAudioElement | null = null;

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

interface StageDimensions {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
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

function drawGrid(
  stage: PIXI.Container,
  gridWidth: number,
  gridHeight: number,
  cellSize: number
) {
  const gfx = new PIXI.Graphics();
  gfx.lineStyle(1, COLORS.GRID, 0.5);
  const widthPx = gridWidth * cellSize;
  const heightPx = gridHeight * cellSize;
  for (let x = 0; x <= gridWidth; x++) {
    const xPos = x * cellSize;
    gfx.moveTo(xPos, 0);
    gfx.lineTo(xPos, heightPx);
  }
  for (let y = 0; y <= gridHeight; y++) {
    const yPos = y * cellSize;
    gfx.moveTo(0, yPos);
    gfx.lineTo(widthPx, yPos);
  }
  stage.addChild(gfx);
}

function clearStage(stage: PIXI.Container) {
  const removed = stage.removeChildren();
  removed.forEach((child) => child.destroy({ children: true }));
}

function renderBoxes(
  layer: PIXI.Container,
  view: ViewModel,
  handlers: HoverHandlers
) {
  layer.removeChildren().forEach((child) => child.destroy());
  view.boxes.forEach((box) => {
    const visual = createBox(styleForKind(box.kind), view.cellSize);
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
    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    const color = goal.satisfied ? COLORS.GOAL_COMPLETE : COLORS.GOAL;
    const alpha = goal.satisfied ? 0.85 : 0.35;
    gfx.beginFill(color, alpha);
    const offset = view.cellSize * 0.12;
    const size = view.cellSize * 0.76;
    gfx.drawRoundedRect(offset, offset, size, size, 6);
    gfx.endFill();
    const text = new PIXI.Text(kind_to_label(goal.prop), {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: Math.max(18, view.cellSize * 0.35),
      fill: goal.satisfied ? 0x1c1c1c : 0xffffff,
      align: "center",
    });
    text.anchor.set(0.5);
    text.position.set(view.cellSize / 2, view.cellSize / 2);
    container.addChild(gfx);
    container.addChild(text);
    const pixel = toPixels(view.cellSize, goal.pos);
    container.position.set(pixel.x, pixel.y);
    layer.addChild(container);
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
  drawGrid(app.stage, view.gridWidth, view.gridHeight, view.cellSize);
  const goalLayer = new PIXI.Container();
  const boxLayer = new PIXI.Container();
  const player = createBox(playerStyle(view.cellSize), view.cellSize);
  app.stage.addChild(goalLayer);
  app.stage.addChild(boxLayer);
  app.stage.addChild(player);
  return { goalLayer, boxLayer, player };
}

function rebuildRenderer(
  app: PIXI.Application,
  view: ViewModel
): RenderContext {
  clearStage(app.stage);
  return createRenderer(app, view);
}

function createPixiApplication(width: number, height: number) {
  return new PIXI.Application({
    width,
    height,
    antialias: true,
    backgroundColor: 0x1a1a1a,
    resolution: 2,
  });
}

// Kick background music off once the browser allows audio playback.
function setupBackgroundMusic() {
  if (backgroundMusic) {
    return backgroundMusic;
  }
  const audio = new Audio(BACKGROUND_MUSIC_SRC);
  audio.loop = true;
  audio.volume = 0.35;
  backgroundMusic = audio;

  function detachInteractionHandlers() {
    window.removeEventListener("pointerdown", resumePlayback);
    window.removeEventListener("keydown", resumePlayback);
  }

  function attachInteractionHandlers() {
    detachInteractionHandlers();
    window.addEventListener("pointerdown", resumePlayback, { once: true });
    window.addEventListener("keydown", resumePlayback, { once: true });
  }

  function resumePlayback() {
    audio
      .play()
      .then(() => {
        detachInteractionHandlers();
      })
      .catch(() => {
        attachInteractionHandlers();
      });
  }

  audio.play().catch(() => {
    attachInteractionHandlers();
  });

  return audio;
}

function applyCanvasSize(
  app: PIXI.Application,
  gridWidth: number,
  gridHeight: number,
  cellSize: number
) {
  const width = gridWidth * cellSize;
  const height = gridHeight * cellSize;
  app.renderer.resize(width, height);
  const canvas = app.view as HTMLCanvasElement;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function mount(app: PIXI.Application): {
  infoPanel: InfoPanelElements;
  backupList: HTMLElement;
  stageWrapper: HTMLElement;
} {
  const container = document.getElementById("game-container")!;
  container.classList.add("game-container");

  const { panel: backupPanel, list: backupList } = createBackupPanel();
  container.appendChild(backupPanel);

  const stageWrapper = document.createElement("div");
  stageWrapper.className = "stage-wrapper";
  stageWrapper.appendChild(app.view as HTMLCanvasElement);
  container.appendChild(stageWrapper);

  const infoPanel = createInfoPanel();
  container.appendChild(infoPanel.panel);

  return { infoPanel, backupList, stageWrapper };
}

function main() {
  let coreModel: CoreModel = init_model();
  let viewModel: ViewModel = moonView(coreModel);
  let rendererDims: StageDimensions = {
    gridWidth: viewModel.gridWidth,
    gridHeight: viewModel.gridHeight,
    cellSize: viewModel.cellSize,
  };
  let needsStageRebuild = false;
  setupBackgroundMusic();

  const levelCatalog = (level_infos() ?? []) as LevelInfo[];
  const levelHotkeys = new Map<string, number>();
  levelCatalog.slice(0, 9).forEach((level, index) => {
    levelHotkeys.set(String(index + 1), level.id);
  });

  const app = createPixiApplication(
    viewModel.gridWidth * viewModel.cellSize,
    viewModel.gridHeight * viewModel.cellSize
  );
  applyCanvasSize(
    app,
    rendererDims.gridWidth,
    rendererDims.gridHeight,
    rendererDims.cellSize
  );
  const { infoPanel, backupList, stageWrapper } = mount(app);
  let ctx = createRenderer(app, viewModel);
  let pendingNextLevelId: number | null = null;

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

  const resizeIfNeeded = (view: ViewModel) => {
    const changed =
      needsStageRebuild ||
      view.gridWidth !== rendererDims.gridWidth ||
      view.gridHeight !== rendererDims.gridHeight ||
      view.cellSize !== rendererDims.cellSize;
    if (!changed) {
      return;
    }
    rendererDims = {
      gridWidth: view.gridWidth,
      gridHeight: view.gridHeight,
      cellSize: view.cellSize,
    };
    applyCanvasSize(
      app,
      rendererDims.gridWidth,
      rendererDims.gridHeight,
      rendererDims.cellSize
    );
    ctx = rebuildRenderer(app, view);
    needsStageRebuild = false;
  };

  const updateNextLevelControl = (view: ViewModel) => {
    const levelIndex = levelCatalog.findIndex(
      (level) => level.id === view.levelId
    );
    const hasNext =
      view.isComplete &&
      levelIndex >= 0 &&
      levelIndex < levelCatalog.length - 1;
    if (!hasNext) {
      pendingNextLevelId = null;
      infoPanel.nextLevelButton.hidden = true;
      infoPanel.nextLevelButton.disabled = true;
      return;
    }
    const nextInfo = levelCatalog[levelIndex + 1];
    pendingNextLevelId = nextInfo.id;
    infoPanel.nextLevelButton.hidden = false;
    infoPanel.nextLevelButton.disabled = false;
    infoPanel.nextLevelButton.textContent = `Next Level：${nextInfo.name}`;
  };

  const render = () => {
    viewModel = moonView(coreModel);
    resizeIfNeeded(viewModel);
    renderScene(ctx, viewModel, handlers);
    updateInfoPanel(infoPanel, viewModel);
    updateNextLevelControl(viewModel);
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

  const loadLevel = (levelId: number) => {
    coreModel = init_model_for(levelId);
    thumbnailStore.clear();
    refreshBackups();
    needsStageRebuild = true;
    render();
  };

  const loadLevelFromJson = (json: string) => {
    const parsed = load_from_json(json);
    if (!parsed || parsed.$tag !== 1) {
      throw new Error("Invalid JSON");
    }
    enpool_level(parsed._0);
    coreModel = build_model(parsed._0);
    thumbnailStore.clear();
    refreshBackups();
    needsStageRebuild = true;
    render();
  };

  const handleLevelHotkey = (key: string) => {
    const levelId = levelHotkeys.get(key);
    if (levelId === undefined) {
      return false;
    }
    if (levelId !== viewModel.levelId) {
      loadLevel(levelId);
    }
    return true;
  };

  const handleGameKey = (key: string) => {
    if (handleLevelHotkey(key)) {
      return true;
    }
    const normalized = key.toLowerCase();
    if (normalized === "z") {
      const next = undo(coreModel);
      if (next !== coreModel) {
        coreModel = next;
        render();
      }
      return true;
    }
    if (normalized === "r") {
      loadLevel(viewModel.levelId);
      return true;
    }
    if (normalized === "b") {
      saveBackup();
      return true;
    }
    const next = move_with_key(coreModel, key);
    if (next !== coreModel) {
      coreModel = next;
      render();
      return true;
    }
    return false;
  };

  createMobileControls({
    mountPoint: stageWrapper,
    onKeyPress: handleGameKey,
  });

  window.addEventListener("keydown", (e) => {
    if (handleGameKey(e.key)) {
      e.preventDefault();
    }
  });

  infoPanel.loadJsonButton.addEventListener("click", async () => {
    const input = await openJsonModal();
    if (!input || !input.trim()) {
      return;
    }
    try {
      loadLevelFromJson(input.trim());
    } catch (error) {
      console.error(error);
      window.alert("Failed to Load Level from JSON: " + error);
    }
  });

  infoPanel.nextLevelButton.addEventListener("click", () => {
    if (pendingNextLevelId !== null) {
      loadLevel(pendingNextLevelId);
    }
  });

  render();
}

main();

function openJsonModal(): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "app-modal";

    const title = document.createElement("h3");
    title.textContent = "Load Level from JSON";
    modal.appendChild(title);

    const description = document.createElement("p");
    description.textContent =
      "Paste the level JSON data below to load a custom level";
    modal.appendChild(description);

    const form = document.createElement("form");
    const textarea = document.createElement("textarea");
    textarea.placeholder = '{ "info": { ... }, "boxes": [] }';
    form.appendChild(textarea);

    const actions = document.createElement("div");
    actions.className = "app-modal__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "app-modal__button";
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "submit";
    confirmBtn.textContent = "Load";
    confirmBtn.className = "app-modal__button app-modal__button--primary";
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    form.appendChild(actions);
    modal.appendChild(form);
    overlay.appendChild(modal);

    const cleanup = () => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    };

    const close = (value: string | null) => {
      cleanup();
      resolve(value);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
    };

    cancelBtn.addEventListener("click", () => close(null));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close(null);
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      close(textarea.value);
    });

    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => textarea.focus());
  });
}

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
