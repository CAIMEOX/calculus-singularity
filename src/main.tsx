import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./app.css";
import { createRoot } from "react-dom/client";
import * as PIXI from "pixi.js";
import { createBox } from "./box";
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
import {
  BackupMeta,
  LevelInfo,
  PlaybackTimeline,
  CoreModel,
  Vector2,
  ViewModel,
} from "./types";
import { COLORS, styleForKind, unwrapResult } from "./utils.js";
import { InfoPanel } from "./InfoPanel";
import { BackupPanel } from "./BackupPanel";

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

const BACKGROUND_MUSIC_SRC = new URL("./assets/ah.mp3", import.meta.url).href;
const GITHUB_SOURCE_URL = "https://github.com/CAIMEOX/calculus-singularity";
const COMPLETED_LEVELS_KEY = "cs_completed_levels";

const placeholderThumbnail = createPlaceholderThumbnail();

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

function NavigationBar({
  githubUrl,
  onLoadJson,
  onOpenEditor,
}: {
  githubUrl: string;
  onLoadJson: () => void;
  onOpenEditor: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const close = () => setOpen(false);
  const toggle = () => setOpen((prev) => !prev);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (dropdownRef.current && event.target instanceof Node) {
        if (!dropdownRef.current.contains(event.target)) {
          close();
        }
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header className="app-nav">
      <div className="app-nav__inner">
        <div className="app-nav__brand">Calculus Singularity</div>
        <div
          ref={dropdownRef}
          className={`app-nav__dropdown ${open ? "is-open" : ""}`}
          aria-expanded={open}
        >
          <button
            type="button"
            className="app-nav__dropdown-toggle"
            aria-haspopup="true"
            onClick={toggle}
          >
            Menu
          </button>
          <div className="app-nav__dropdown-list">
            <button
              type="button"
              className="app-nav__dropdown-item"
              onClick={() => {
                close();
                onLoadJson();
              }}
            >
              Load From JSON
            </button>
            <button
              type="button"
              className="app-nav__dropdown-item"
              onClick={() => {
                close();
                window.open(githubUrl, "_blank");
              }}
            >
              View GitHub Source
            </button>
            <button
              type="button"
              className="app-nav__dropdown-item"
              onClick={() => {
                close();
                onOpenEditor();
              }}
            >
              Open Level Editor
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function PlaybackControls({
  hasTimeline,
  playing,
  currentFrame,
  totalFrames,
  onLoad,
  onExport,
  onPlayPause,
  onClear,
  onScrub,
}: {
  hasTimeline: boolean;
  playing: boolean;
  currentFrame: number;
  totalFrames: number;
  onLoad: () => void;
  onExport: () => void;
  onPlayPause: () => void;
  onClear: () => void;
  onScrub: (value: number) => void;
}) {
  const label = `Frame ${currentFrame} / ${totalFrames}`;
  return (
    <div className="playback-controls">
      <div className="playback-controls__header">
        <span className="playback-controls__title">Playback</span>
        <div className="playback-controls__actions">
          <button
            type="button"
            className="playback-controls__button"
            onClick={onLoad}
          >
            Load Steps
          </button>
          <button
            type="button"
            className="playback-controls__button"
            onClick={onExport}
          >
            Export Steps
          </button>
        </div>
      </div>
      <div className="playback-controls__progress">
        <button
          type="button"
          className="playback-controls__button playback-controls__button--primary"
          disabled={!hasTimeline}
          onClick={onPlayPause}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          className="playback-controls__slider"
          type="range"
          min="0"
          max={Math.max(totalFrames, 0)}
          value={Math.min(currentFrame, totalFrames)}
          step="1"
          disabled={!hasTimeline}
          onChange={(event) => onScrub(Number(event.target.value) || 0)}
        />
        <span className="playback-controls__label">{label}</span>
        <button
          type="button"
          className="playback-controls__button"
          disabled={!hasTimeline}
          onClick={onClear}
        >
          Exit
        </button>
      </div>
    </div>
  );
}

interface TextPromptOptions {
  title: string;
  description: string;
  initialValue: string;
  confirmLabel?: string;
}

interface TextPrompt extends TextPromptOptions {
  resolve: (value: string | null) => void;
}

function TextModal({
  title,
  description,
  initialValue,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: TextPromptOptions & {
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    textareaRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="app-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="app-modal">
        <h3>{title}</h3>
        <p>{description}</p>
        <form
          className="app-modal__form"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(value);
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={12}
            spellCheck={false}
            autoComplete="off"
          />
          <div className="app-modal__actions">
            <button
              type="button"
              className="app-modal__button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="app-modal__button app-modal__button--primary"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GameStage({
  view,
  handlers,
  interactive,
  onAppReady,
}: {
  view: ViewModel;
  handlers: HoverHandlers;
  interactive: boolean;
  onAppReady?: (app: PIXI.Application) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const ctxRef = useRef<RenderContext | null>(null);
  const dimsRef = useRef<StageDimensions | null>(null);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const app = createPixiApplication(
      view.gridWidth * view.cellSize,
      view.gridHeight * view.cellSize
    );
    appRef.current = app;
    applyCanvasSize(app, view.gridWidth, view.gridHeight, view.cellSize);
    hostRef.current.appendChild(app.view as HTMLCanvasElement);
    ctxRef.current = createRenderer(app, view);
    dimsRef.current = {
      gridWidth: view.gridWidth,
      gridHeight: view.gridHeight,
      cellSize: view.cellSize,
    };
    if (onAppReady) {
      onAppReady(app);
    }
    return () => {
      ctxRef.current = null;
      dimsRef.current = null;
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!appRef.current || !ctxRef.current) {
      return;
    }
    const dims = dimsRef.current;
    const needsRebuild =
      !dims ||
      dims.gridWidth !== view.gridWidth ||
      dims.gridHeight !== view.gridHeight ||
      dims.cellSize !== view.cellSize;
    if (needsRebuild) {
      ctxRef.current = rebuildRenderer(appRef.current, view);
      dimsRef.current = {
        gridWidth: view.gridWidth,
        gridHeight: view.gridHeight,
        cellSize: view.cellSize,
      };
      applyCanvasSize(
        appRef.current,
        view.gridWidth,
        view.gridHeight,
        view.cellSize
      );
    }
    renderScene(
      ctxRef.current,
      view,
      interactive ? handlers : { hover: () => {}, leave: () => {} }
    );
  }, [view, handlers, interactive]);

  return <div className="stage-canvas" ref={hostRef} />;
}

function MobileControls({ onKeyPress }: { onKeyPress: (key: string) => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const controls = createMobileControls({
      mountPoint: hostRef.current,
      onKeyPress,
    });
    return () => controls.destroy();
  }, [onKeyPress]);
  return <div ref={hostRef} />;
}

interface PlaybackState {
  timeline: PlaybackTimeline | null;
  currentFrame: number;
  playing: boolean;
}

function App() {
  const [coreModel, setCoreModel] = useState<CoreModel>(() => init_model());
  const [playback, setPlayback] = useState<PlaybackState>({
    timeline: null,
    currentFrame: 0,
    playing: false,
  });
  const playbackTimer = useRef<number | null>(null);
  const thumbnails = useRef(new Map<number, string>());
  const appRef = useRef<PIXI.Application | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(() =>
    loadCompletedLevels()
  );
  const [textPrompt, setTextPrompt] = useState<TextPrompt | null>(null);
  const promptText = useCallback(
    (options: TextPromptOptions) =>
      new Promise<string | null>((resolve) => {
        setTextPrompt({
          ...options,
          confirmLabel: options.confirmLabel ?? "Confirm",
          resolve,
        });
      }),
    []
  );

  const levelCatalog = useMemo(() => (level_infos() ?? []) as LevelInfo[], []);
  const levelHotkeys = useMemo(() => {
    const map = new Map<string, number>();
    levelCatalog.slice(0, 9).forEach((level, index) => {
      map.set(String(index + 1), level.id);
    });
    return map;
  }, [levelCatalog]);

  const liveView = useMemo(() => moonView(coreModel), [coreModel]);
  const playbackFrame = useMemo(() => {
    if (!playback.timeline) {
      return null;
    }
    const frameFromCache =
      playback.timeline.frames?.[playback.currentFrame] ?? null;
    if (frameFromCache) {
      return frameFromCache;
    }
    return safePlaybackFrame(playback.timeline, playback.currentFrame);
  }, [playback]);

  const displayView = useMemo(
    () => normalizeViewModel(playbackFrame, liveView),
    [playbackFrame, liveView]
  );

  const levelComplete =
    liveView.isComplete || completedLevels.has(liveView.levelId);

  const nextLevelInfo = useMemo(() => {
    const index = levelCatalog.findIndex(
      (level) => level.id === liveView.levelId
    );
    return index >= 0 ? levelCatalog[index + 1] ?? null : null;
  }, [levelCatalog, liveView.levelId]);
  const nextLevelId = nextLevelInfo?.id ?? null;
  const nextLevelName = nextLevelInfo?.name ?? null;

  const getBackups = useCallback(
    () => (list_backups(coreModel) ?? []) as BackupMeta[],
    [coreModel]
  );

  const activeBackupId = useMemo(() => {
    const meta =
      (get_active_backup_meta(coreModel) as BackupMeta | undefined) ??
      undefined;
    return meta ? String(meta.id) : null;
  }, [coreModel]);

  const backupItems = useMemo(() => {
    return getBackups()
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((meta) => ({
        id: String(meta.id),
        timestamp: meta.timestamp,
        thumbnail: thumbnails.current.get(meta.id) ?? placeholderThumbnail,
      }));
  }, [getBackups]);

  useEffect(() => {
    if (!liveView.isComplete) {
      return;
    }
    setCompletedLevels((prev) => {
      if (prev.has(liveView.levelId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(liveView.levelId);
      persistCompletedLevels(next);
      return next;
    });
  }, [liveView]);

  useEffect(() => {
    setupBackgroundMusic();
  }, []);

  useEffect(() => {
    if (!playback.playing || !playback.timeline) {
      return;
    }
    playbackTimer.current = window.setInterval(() => {
      setPlayback((prev) => {
        if (!prev.timeline) {
          return prev;
        }
        const nextFrame = prev.currentFrame + 1;
        const lastFrame = (prev.timeline.frames?.length ?? 0) - 1;
        if (lastFrame >= 0 && nextFrame > lastFrame) {
          return { ...prev, playing: false, currentFrame: lastFrame };
        }
        return { ...prev, currentFrame: nextFrame };
      });
    }, 550);
    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    };
  }, [playback.playing, playback.timeline]);

  const setPlaybackTimeline = useCallback((timeline: PlaybackTimeline) => {
    setPlayback({ timeline, currentFrame: 0, playing: false });
  }, []);

  const clearPlaybackTimeline = useCallback(() => {
    setPlayback({ timeline: null, currentFrame: 0, playing: false });
  }, []);

  const handleLoadPlayback = useCallback(async () => {
    const input = await promptText({
      title: "Load Playback Steps",
      description: "Paste the serialized move steps below.",
      initialValue: "",
    });
    if (!input || !input.trim()) {
      return;
    }
    try {
      const baseModel = init_model_for(liveView.levelId);
      const timelineResult = build_playback_timeline(baseModel, input.trim());
      const timeline: PlaybackTimeline = unwrapResult(
        timelineResult,
        "build_playback_timeline"
      );
      setPlaybackTimeline(attachPlaybackFrames(timeline));
    } catch (error) {
      console.error(error);
      showToast("Failed to load steps: " + error);
    }
  }, [liveView.levelId, setPlaybackTimeline, promptText]);

  const handleExportMoves = useCallback(async () => {
    try {
      const serialized = export_moves(coreModel) as string;
      const copied = await copyToClipboard(serialized);
      if (!copied) {
        await promptText({
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
  }, [coreModel, promptText]);

  const handleLoadFromJson = useCallback(async () => {
    const input = await promptText({
      title: "Load Level JSON",
      description: "Paste a JSON file exported from the level editor.",
      initialValue: "",
    });
    if (!input || !input.trim()) {
      return;
    }
    try {
      clearPlaybackTimeline();
      const parsed = load_from_json(input.trim());
      if (!parsed || parsed.$tag !== 1) {
        throw new Error("Invalid JSON");
      }
      enpool_level(parsed._0);
      thumbnails.current.clear();
      setCoreModel(build_model(parsed._0));
    } catch (error) {
      console.error(error);
      showToast("Failed to Load Level from JSON: " + error);
    }
  }, [clearPlaybackTimeline, promptText]);

  const loadLevel = useCallback(
    (levelId: number) => {
      clearPlaybackTimeline();
      thumbnails.current.clear();
      setCoreModel(init_model_for(levelId));
    },
    [clearPlaybackTimeline]
  );

  const saveBackup = useCallback(() => {
    if (!appRef.current) {
      return;
    }
    const thumbnail = captureThumbnail(appRef.current);
    setCoreModel((current) => {
      const updated = save_backup(current, Date.now());
      const activeMeta =
        (get_active_backup_meta(updated) as BackupMeta | undefined) ??
        undefined;
      if (activeMeta) {
        thumbnails.current.set(activeMeta.id, thumbnail);
      }
      return updated;
    });
  }, []);

  const handleBackupSelect = useCallback((id: string) => {
    const backupId = Number(id);
    setCoreModel((current) => restore_backup(current, backupId));
  }, []);

  const levelHotkeyHandler = useCallback(
    (key: string) => {
      const levelId = levelHotkeys.get(key);
      if (levelId === undefined) {
        return false;
      }
      if (levelId !== liveView.levelId) {
        loadLevel(levelId);
      }
      return true;
    },
    [levelHotkeys, liveView.levelId, loadLevel]
  );

  const handleGameKey = useCallback(
    (key: string) => {
      if (textPrompt) {
        return false;
      }
      if (playback.timeline) {
        clearPlaybackTimeline();
      }
      if (levelHotkeyHandler(key)) {
        return true;
      }
      const normalized = key.toLowerCase();
      if (normalized === "z") {
        setCoreModel((current) => {
          const next = undo(current);
          return next === current ? current : next;
        });
        return true;
      }
      if (normalized === "r") {
        loadLevel(liveView.levelId);
        return true;
      }
      if (normalized === "b") {
        saveBackup();
        return true;
      }
      setCoreModel((current) => {
        const next = move_with_key(current, key);
        return next === current ? current : next;
      });
      return true;
    },
    [
      playback.timeline,
      clearPlaybackTimeline,
      levelHotkeyHandler,
      loadLevel,
      liveView.levelId,
      saveBackup,
      textPrompt,
    ]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (handleGameKey(event.key)) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleGameKey]);

  const hoverHandlers = useMemo<HoverHandlers>(
    () => ({
      hover: (boxId) => {
        setCoreModel((current) => hover_box(current, boxId));
      },
      leave: () => {
        setCoreModel((current) => clear_hover(current));
      },
    }),
    []
  );

  const setPlaybackFrame = useCallback((frame: number) => {
    setPlayback((prev) => {
      if (!prev.timeline) {
        return prev;
      }
      const lastFrame = (prev.timeline.frames?.length ?? 1) - 1;
      const clamped = Math.max(0, Math.min(frame, lastFrame));
      return { ...prev, currentFrame: clamped };
    });
  }, []);

  const startPlayback = useCallback(() => {
    setPlayback((prev) => (prev.timeline ? { ...prev, playing: true } : prev));
  }, []);

  const stopPlayback = useCallback(() => {
    setPlayback((prev) => ({ ...prev, playing: false }));
  }, []);

  const hasTimeline = playback.timeline !== null;
  const totalFrames = playback.timeline?.frames?.length
    ? playback.timeline.frames.length - 1
    : 0;

  const infoPanelDisabled = playback.timeline !== null;
  const canGoNext = levelComplete && nextLevelId !== null && !infoPanelDisabled;

  return (
    <>
      <NavigationBar
        githubUrl={GITHUB_SOURCE_URL}
        onLoadJson={handleLoadFromJson}
        onOpenEditor={() => window.open("editor.html", "_blank")}
      />
      <div className="game-container">
        <BackupPanel
          items={backupItems}
          activeId={activeBackupId}
          onSelect={handleBackupSelect}
        />
        <div className="stage-wrapper">
          <GameStage
            view={displayView}
            handlers={hoverHandlers}
            interactive={!hasTimeline}
            onAppReady={(app) => {
              appRef.current = app;
            }}
          />
          <PlaybackControls
            hasTimeline={hasTimeline}
            playing={playback.playing}
            currentFrame={playback.currentFrame}
            totalFrames={totalFrames}
            onLoad={handleLoadPlayback}
            onExport={handleExportMoves}
            onPlayPause={() => {
              if (!hasTimeline) {
                return;
              }
              if (playback.playing) {
                stopPlayback();
              } else {
                startPlayback();
              }
            }}
            onClear={() => {
              clearPlaybackTimeline();
            }}
            onScrub={(value) => {
              stopPlayback();
              setPlaybackFrame(value);
            }}
          />
          <MobileControls onKeyPress={handleGameKey} />
        </div>
        <InfoPanel
          model={displayView}
          nextLevelId={nextLevelId}
          nextLevelName={nextLevelName}
          canGoNext={canGoNext}
          disabled={infoPanelDisabled}
          onNext={() => {
            if (nextLevelId !== null) {
              loadLevel(nextLevelId);
            }
          }}
        />
        {textPrompt && (
          <TextModal
            title={textPrompt.title}
            description={textPrompt.description}
            initialValue={textPrompt.initialValue}
            confirmLabel={textPrompt.confirmLabel}
            onCancel={() => {
              textPrompt.resolve(null);
              setTextPrompt(null);
            }}
            onConfirm={(value) => {
              textPrompt.resolve(value);
              setTextPrompt(null);
            }}
          />
        )}
      </div>
    </>
  );
}

function safePlaybackFrame(
  timeline: PlaybackTimeline,
  index: number
): ViewModel | null {
  try {
    const frameResult = playback_frame(timeline, index);
    return unwrapResult(frameResult, "playback_frame");
  } catch (error) {
    console.error("Failed to read playback frame", error);
    return null;
  }
}

function attachPlaybackFrames(timeline: PlaybackTimeline): PlaybackTimeline {
  if (timeline.frames && timeline.frames.length > 0) {
    return timeline;
  }
  const frames: ViewModel[] = [];
  const MAX_FRAMES = 5000;
  for (let i = 0; i < MAX_FRAMES; i++) {
    const frame = safePlaybackFrame(timeline, i);
    if (!frame) {
      break;
    }
    frames.push(frame);
  }
  return { ...timeline, frames };
}

function normalizeViewModel(
  playbackFrame: any,
  fallback: ViewModel
): ViewModel {
  if (!playbackFrame) {
    return fallback;
  }
  const candidate = playbackFrame as Partial<ViewModel>;
  return {
    goals: candidate.goals ?? fallback.goals,
    boxes: candidate.boxes ?? fallback.boxes,
    player: candidate.player ?? fallback.player,
    gridWidth: candidate.gridWidth ?? fallback.gridWidth,
    gridHeight: candidate.gridHeight ?? fallback.gridHeight,
    cellSize: candidate.cellSize ?? fallback.cellSize,
    levelId: candidate.levelId ?? fallback.levelId,
    levelName: candidate.levelName ?? fallback.levelName,
    isComplete: candidate.isComplete ?? fallback.isComplete,
    hoveredBoxId: candidate.hoveredBoxId ?? fallback.hoveredBoxId,
  };
}

// Kick background music off once the browser allows audio playback.
function setupBackgroundMusic() {
  const audio = new Audio(BACKGROUND_MUSIC_SRC);
  audio.loop = true;
  audio.volume = 0.35;

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
      .map((value: unknown) => Number(value))
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

const rootElement = document.getElementById("game-container");
if (!rootElement) {
  throw new Error("Game container not found");
}

const root = createRoot(rootElement);
root.render(<App />);
