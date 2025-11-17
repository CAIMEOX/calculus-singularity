import { Result as MbtResult } from "../singularity/target/js/release/build/moonbit";
export type Result<T, E> = MbtResult<T, E>;

export type CoreModel = "core-model-placeholder";
export type Kind = "kind-placeholder";
export type MoveStep = "move-step-placeholder";
export type KindParseError = "kind-parse-error-placeholder";
export type LoadLevelError = "load-level-error-placeholder";
export type PlaybackError = "playback-error-placeholder";
export type Int = number;

export interface BackupMeta {
  id: number;
  parentId: number | null;
  childIds: number[];
  timestamp: number;
}

export interface PlaybackTimeline {
  moves: MoveStep[];
  frames: ViewModel[];
  snapshots?: { player: Vector2; boxes: any[] }[];
}

export interface PlaybackState {
  timeline: PlaybackTimeline | null;
  currentFrame: number;
  playing: boolean;
  timer: number | null;
}

export interface PlaybackControls {
  container: HTMLElement;
  loadButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  playPauseButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  progress: HTMLInputElement;
  label: HTMLElement;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface BoxView {
  id: number;
  pos: Vector2;
  kind: Kind;
  label?: string | null;
  secondary?: string | null;
}

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

export type InfoLineTone = "normal" | "hovered" | "proved" | "unexpected";

export interface InfoPanelLine {
  text: string;
  tone: InfoLineTone;
  kind?: Kind | null;
}

export interface InfoPanelStat {
  label: string;
  value: string;
}

export interface InfoPanelData {
  title: string;
  stats: InfoPanelStat[];
  boxes: InfoPanelLine[];
  goals: InfoPanelLine[];
}

export type Box = BoxView;

export interface LevelInfo {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  description: string;
}

export interface LevelBox {
  id: number;
  pos: Vector2;
  kind: Kind;
}

export interface Goal {
  pos: Vector2;
  prop: Kind;
}

export interface Level {
  info: LevelInfo;
  player: Vector2;
  boxes: LevelBox[];
  goals: Goal[];
}
