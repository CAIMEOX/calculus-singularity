import * as PIXI from "pixi.js";
import { createBox } from "./box";
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
  export_moves,
  build_playback_timeline,
  playback_frame,
} from "../singularity/target/js/release/build/cs.js";
import { COLORS, styleForKind } from "./utils.js";

function unwrapResult<T>(result: any, label: string): T {
  if (!result || typeof result !== "object") {
    throw new Error(`${label} returned no data`);
  }
  if ("$tag" in result) {
    if (result.$tag === 1 && "_0" in result) {
      return result._0 as T;
    }
    if (result.$tag === 0 && "_0" in result) {
      throw result._0 ?? new Error(`${label} failed`);
    }
  }
  return result as T;
}

function showToast(message: string) {
  let container = document.querySelector<HTMLElement>(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3000);
}

interface BackupMeta {
  id: number;
  parentId: number | null;
  childIds: number[];
  timestamp: number;
}

type MoveStep = "move-step-placeholder"

interface PlaybackTimeline {
  moves: MoveStep[];
  frames: ViewModel[];
  snapshots?: { player: Vector2; boxes: any[] }[];
}

interface PlaybackState {
  timeline: PlaybackTimeline | null;
  currentFrame: number;
  playing: boolean;
  timer: number | null;
}

interface PlaybackControls {
  container: HTMLElement;
  loadButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  playPauseButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  progress: HTMLInputElement;
  label: HTMLElement;
}

const BACKGROUND_MUSIC_SRC = new URL("./assets/ah.mp3", import.meta.url).href;
const GITHUB_SOURCE_URL = "https://github.com/CAIMEOX/calculus-singularity";
let backgroundMusic: HTMLAudioElement | null = null;

const thumbnailStore = new Map<number, string>();
const placeholderThumbnail = createPlaceholderThumbnail();
const COMPLETED_LEVELS_KEY = "cs_completed_levels";
const completedLevels = loadCompletedLevels();

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

interface NavigationBar {
  element: HTMLElement;
  loadJsonButton: HTMLButtonElement;
  openLevelEditorButton: HTMLButtonElement;
  closeMenu: () => void;
}

function createNavigationBar(githubUrl: string): NavigationBar {
  const nav = document.createElement("header");
  nav.className = "app-nav";

  const inner = document.createElement("div");
  inner.className = "app-nav__inner";

  const brand = document.createElement("div");
  brand.className = "app-nav__brand";
  brand.textContent = "Calculus Singularity";

  const dropdown = document.createElement("div");
  dropdown.className = "app-nav__dropdown";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "app-nav__dropdown-toggle";
  toggle.textContent = "Menu";
  toggle.setAttribute("aria-haspopup", "true");
  toggle.setAttribute("aria-expanded", "false");

  const list = document.createElement("div");
  list.className = "app-nav__dropdown-list";

  const loadJsonButton = document.createElement("button");
  loadJsonButton.type = "button";
  loadJsonButton.className = "app-nav__dropdown-item";
  loadJsonButton.textContent = "Load From JSON";
  list.appendChild(loadJsonButton);

  const githubLink = document.createElement("button");
  githubLink.type = "button";
  githubLink.className = "app-nav__dropdown-item";
  githubLink.textContent = "View GitHub Source";
  githubLink.addEventListener("click", () => {
    window.open(githubUrl, "_blank");
  });
  list.appendChild(githubLink);

  const openLevelEditorButton = document.createElement("button");
  openLevelEditorButton.type = "button";
  openLevelEditorButton.className = "app-nav__dropdown-item";
  openLevelEditorButton.textContent = "Open Level Editor";
  list.appendChild(openLevelEditorButton);

  dropdown.appendChild(toggle);
  dropdown.appendChild(list);
  inner.appendChild(brand);
  inner.appendChild(dropdown);
  nav.appendChild(inner);

  const setOpen = (open: boolean) => {
    dropdown.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  const closeMenu = () => setOpen(false);

  list.addEventListener("click", () => closeMenu());

  const onDocumentClick = (event: MouseEvent) => {
    if (!dropdown.contains(event.target as Node)) {
      closeMenu();
    }
  };

  const onEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  };

  toggle.addEventListener("click", () => {
    const next = !dropdown.classList.contains("is-open");
    setOpen(next);
  });

  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onEscape);
  const cleanup = () => {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onEscape);
    window.removeEventListener("beforeunload", cleanup);
  };
  window.addEventListener("beforeunload", cleanup);

  return { element: nav, loadJsonButton, openLevelEditorButton, closeMenu };
}

function createPlaybackControls(): PlaybackControls {
  const container = document.createElement("div");
  container.className = "playback-controls";

  const header = document.createElement("div");
  header.className = "playback-controls__header";
  const title = document.createElement("span");
  title.textContent = "Playback";
  title.className = "playback-controls__title";

  const actions = document.createElement("div");
  actions.className = "playback-controls__actions";
  const loadButton = document.createElement("button");
  loadButton.type = "button";
  loadButton.textContent = "Load Steps";
  loadButton.className = "playback-controls__button";
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Export Steps";
  exportButton.className = "playback-controls__button";
  actions.appendChild(loadButton);
  actions.appendChild(exportButton);

  header.appendChild(title);
  header.appendChild(actions);

  const progressRow = document.createElement("div");
  progressRow.className = "playback-controls__progress";
  const playPauseButton = document.createElement("button");
  playPauseButton.type = "button";
  playPauseButton.textContent = "Play";
  playPauseButton.className = "playback-controls__button playback-controls__button--primary";

  const progress = document.createElement("input");
  progress.type = "range";
  progress.min = "0";
  progress.max = "0";
  progress.value = "0";
  progress.step = "1";
  progress.className = "playback-controls__slider";
  progress.disabled = true;

  const label = document.createElement("span");
  label.className = "playback-controls__label";
  label.textContent = "Frame 0 / 0";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Exit";
  clearButton.className = "playback-controls__button";
  clearButton.disabled = true;

  progressRow.appendChild(playPauseButton);
  progressRow.appendChild(progress);
  progressRow.appendChild(label);
  progressRow.appendChild(clearButton);

  container.appendChild(header);
  container.appendChild(progressRow);

  return {
    container,
    loadButton,
    exportButton,
    playPauseButton,
    clearButton,
    progress,
    label,
  };
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

function mount(
  app: PIXI.Application,
  container: HTMLElement
): {
  infoPanel: InfoPanelElements;
  backupList: HTMLElement;
  stageWrapper: HTMLElement;
} {
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
  const container = document.getElementById("game-container");
  if (!container) {
    throw new Error("Game container not found");
  }
  const navigation = createNavigationBar(GITHUB_SOURCE_URL);
  if (container.parentElement) {
    container.parentElement.insertBefore(navigation.element, container);
  } else {
    document.body.prepend(navigation.element);
  }

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
  const { infoPanel, backupList, stageWrapper } = mount(app, container);
  const playbackControls = createPlaybackControls();
  stageWrapper.appendChild(playbackControls.container);
  let ctx = createRenderer(app, viewModel);
  let pendingNextLevelId: number | null = null;
  const playbackState: PlaybackState = {
    timeline: null,
    currentFrame: 0,
    playing: false,
    timer: null,
  };

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

  const passiveHandlers: HoverHandlers = {
    hover: () => {},
    leave: () => {},
  };

  const isPlaybackActive = () => playbackState.timeline !== null;

  const safePlaybackFrame = (index: number): ViewModel | null => {
    if (!playbackState.timeline) {
      return null;
    }
    try {
      const frameResult = playback_frame(playbackState.timeline, index);
      return unwrapResult<ViewModel>(frameResult, "playback_frame");
    } catch (error) {
      console.error("Failed to read playback frame", error);
      return null;
    }
  };

  const stopPlayback = () => {
    if (playbackState.timer !== null) {
      window.clearInterval(playbackState.timer);
      playbackState.timer = null;
    }
    playbackState.playing = false;
  };

  const updatePlaybackControlsUI = () => {
    const timeline = playbackState.timeline;
    const totalFrames = timeline ? Math.max(0, timeline.frames.length - 1) : 0;
    playbackControls.progress.disabled = !timeline;
    playbackControls.playPauseButton.disabled = !timeline;
    playbackControls.clearButton.disabled = !timeline;
    playbackControls.progress.max = String(totalFrames);
    playbackControls.progress.value = String(
      timeline ? playbackState.currentFrame : 0
    );
    playbackControls.playPauseButton.textContent = playbackState.playing
      ? "Pause"
      : "Play";
    playbackControls.label.textContent = timeline
      ? `Frame ${playbackState.currentFrame} / ${totalFrames}`
      : "Playback idle";
  };

  const clearPlaybackTimeline = () => {
    stopPlayback();
    playbackState.timeline = null;
    playbackState.currentFrame = 0;
    updatePlaybackControlsUI();
  };

  const setPlaybackFrame = (index: number) => {
    if (!playbackState.timeline) {
      return;
    }
    const maxFrame = Math.max(0, playbackState.timeline.frames.length - 1);
    const clamped = Math.min(Math.max(index, 0), maxFrame);
    playbackState.currentFrame = clamped;
    updatePlaybackControlsUI();
    render();
  };

  const startPlayback = () => {
    if (!playbackState.timeline) {
      return;
    }
    stopPlayback();
    playbackState.playing = true;
    playbackState.timer = window.setInterval(() => {
      if (!playbackState.timeline) {
        stopPlayback();
        return;
      }
      const next = playbackState.currentFrame + 1;
      if (next > playbackState.timeline.frames.length - 1) {
        stopPlayback();
        updatePlaybackControlsUI();
        return;
      }
      setPlaybackFrame(next);
    }, 550);
    updatePlaybackControlsUI();
  };

  const setPlaybackTimeline = (timeline: PlaybackTimeline) => {
    playbackState.timeline = timeline;
    playbackState.currentFrame = 0;
    stopPlayback();
    updatePlaybackControlsUI();
    render();
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

  const updateNextLevelControl = (
    view: ViewModel,
    canAdvanceToNextLevel: boolean
  ) => {
    const levelIndex = levelCatalog.findIndex(
      (level) => level.id === view.levelId
    );
    const hasNext =
      canAdvanceToNextLevel &&
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

  const normalizeViewModel = (
    candidate: Partial<ViewModel> | null,
    fallback: ViewModel
  ): ViewModel => {
    if (!candidate) {
      return fallback;
    }
    return {
      ...fallback,
      ...candidate,
      goals: candidate.goals ?? fallback.goals,
      boxes: candidate.boxes ?? fallback.boxes,
      player: candidate.player ?? fallback.player,
      gridWidth: candidate.gridWidth ?? fallback.gridWidth,
      gridHeight: candidate.gridHeight ?? fallback.gridHeight,
      cellSize: candidate.cellSize ?? fallback.cellSize,
      levelId: candidate.levelId ?? fallback.levelId,
      levelName: candidate.levelName ?? fallback.levelName,
      isComplete: candidate.isComplete ?? fallback.isComplete,
    };
  };

  const render = () => {
    viewModel = moonView(coreModel);
    const alreadyComplete = levelHasCachedCompletion(viewModel.levelId);
    if (viewModel.isComplete && !alreadyComplete) {
      markLevelCompleted(viewModel.levelId);
    }
    const levelComplete = viewModel.isComplete || alreadyComplete;
    const playbackFrame = playbackState.timeline
      ? safePlaybackFrame(playbackState.currentFrame)
      : null;
    const displayView = normalizeViewModel(playbackFrame, viewModel);
    resizeIfNeeded(displayView);
    renderScene(
      ctx,
      displayView,
      isPlaybackActive() ? passiveHandlers : handlers
    );
    updateInfoPanel(infoPanel, displayView);
    if (isPlaybackActive()) {
      infoPanel.nextLevelButton.hidden = true;
      infoPanel.nextLevelButton.disabled = true;
    } else {
      updateNextLevelControl(viewModel, levelComplete);
    }
    updatePlaybackControlsUI();
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
    clearPlaybackTimeline();
    coreModel = init_model_for(levelId);
    thumbnailStore.clear();
    refreshBackups();
    needsStageRebuild = true;
    render();
  };

  const loadLevelFromJson = (json: string) => {
    clearPlaybackTimeline();
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
    if (isPlaybackActive()) {
      clearPlaybackTimeline();
      stopPlayback();
    }
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

  const handleLoadFromJson = async () => {
    const input = await openJsonModal();
    if (!input || !input.trim()) {
      return;
    }
    try {
      loadLevelFromJson(input.trim());
    } catch (error) {
      console.error(error);
      showToast("Failed to Load Level from JSON: " + error);
    }
  };

  const handleOpenLevelEditor = () => {
    window.open("editor.html", "_blank");
  };

  const handleLoadPlayback = async () => {
    const input = await openMovesModal();
    if (!input || !input.trim()) {
      return;
    }
    try {
      const timelineResult = build_playback_timeline(coreModel, input.trim());
      const timeline = unwrapResult<PlaybackTimeline>(
        timelineResult,
        "build_playback_timeline"
      );
      setPlaybackTimeline(timeline);
    } catch (error) {
      console.error(error);
      showToast("Failed to load steps: " + error);
    }
  };

  const handleExportMoves = async () => {
    try {
      const serialized = export_moves(coreModel) as string;
      const copied = await copyToClipboard(serialized);
      if (!copied) {
        await openTextModal({
          title: "Export Moves",
          description: "Copy the serialized move steps below.",
          initialValue: serialized,
          confirmLabel: "Close",
        });
      } else {
        showToast("Move steps copied to clipboard");
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to export moves: " + error);
    }
  };

  navigation.loadJsonButton.addEventListener("click", () => {
    navigation.closeMenu();
    handleLoadFromJson();
  });

  navigation.openLevelEditorButton.addEventListener("click", () => {
    navigation.closeMenu();
    handleOpenLevelEditor();
  });

  playbackControls.loadButton.addEventListener("click", () => {
    handleLoadPlayback();
  });

  playbackControls.exportButton.addEventListener("click", () => {
    handleExportMoves();
  });

  playbackControls.playPauseButton.addEventListener("click", () => {
    if (!isPlaybackActive()) {
      return;
    }
    if (playbackState.playing) {
      stopPlayback();
      updatePlaybackControlsUI();
    } else {
      startPlayback();
    }
  });

  playbackControls.clearButton.addEventListener("click", () => {
    clearPlaybackTimeline();
    render();
  });

  playbackControls.progress.addEventListener("input", (event) => {
    stopPlayback();
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    setPlaybackFrame(Number.isFinite(value) ? value : 0);
  });

  infoPanel.nextLevelButton.addEventListener("click", () => {
    if (pendingNextLevelId !== null) {
      loadLevel(pendingNextLevelId);
    }
  });

  updatePlaybackControlsUI();
  render();
}

main();

function openJsonModal(): Promise<string | null> {
  return openTextModal({
    title: "Load Level from JSON",
    description: "Paste the level JSON data below to load a custom level",
    placeholder: '{ "info": { ... }, "boxes": [] }',
    confirmLabel: "Load",
  });
}

interface TextModalOptions {
  title: string;
  description: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

function openMovesModal(): Promise<string | null> {
  return openTextModal({
    title: "Load Move Steps",
    description: "Paste a serialized Array<Move> to preview playback.",
    placeholder: '[{ "index": 1, "direction": "Right", "description": "" }]',
    confirmLabel: "Load",
  });
}

function openTextModal(options: TextModalOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const {
      title,
      description,
      placeholder = "",
      initialValue = "",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
    } = options;
    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "app-modal";

    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    modal.appendChild(titleEl);

    const descriptionEl = document.createElement("p");
    descriptionEl.textContent = description;
    modal.appendChild(descriptionEl);

    const form = document.createElement("form");
    const textarea = document.createElement("textarea");
    textarea.placeholder = placeholder;
    textarea.value = initialValue;
    form.appendChild(textarea);

    const actions = document.createElement("div");
    actions.className = "app-modal__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = cancelLabel;
    cancelBtn.className = "app-modal__button";
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "submit";
    confirmBtn.textContent = confirmLabel;
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

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
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

function loadCompletedLevels(): Set<number> {
  if (typeof window === "undefined" || !window.localStorage) {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(COMPLETED_LEVELS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    const validIds = parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    return new Set(validIds);
  } catch {
    return new Set();
  }
}

function persistCompletedLevels(levels: Set<number>): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const sorted = Array.from(levels).sort((a, b) => a - b);
    window.localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify(sorted));
  } catch {
    // Ignore persistence errors (e.g., storage denied).
  }
}

function markLevelCompleted(levelId: number): void {
  if (completedLevels.has(levelId)) {
    return;
  }
  completedLevels.add(levelId);
  persistCompletedLevels(completedLevels);
}

function levelHasCachedCompletion(levelId: number): boolean {
  return completedLevels.has(levelId);
}
