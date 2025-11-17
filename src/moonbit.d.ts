import {
  Kind,
  CoreModel as Model,
  ViewModel,
  InfoPanelData,
  Box,
  Level,
  Goal,
  KindParseError,
  LoadLevelError,
  PlaybackTimeline,
  PlaybackError,
  Int,
  Result,
} from "./types";

declare module "../singularity/target/js/release/build/cs.js" {
  export function init_model(): Model;
  export function init_model_for(levelId: Int): Model;
  export function move_with_key(model: Model, key: string): Model;
  export function hover_box(model: Model, boxId: Int): Model;
  export function clear_hover(model: Model): Model;
  export function undo(model: Model): Model;
  export function save_backup(model: Model, timestamp: Int): Model;
  export function list_backups(model: Model): any;
  export function get_active_backup_meta(model: unknown): any;
  export function restore_backup(model: Model, backupId: Int): Model;
  export function view(model: Model): ViewModel;
  export function generate_panel_content(model: Model): InfoPanelData;
  export function level_infos(): any;
  export function load_from_json(json: string): Result<Level, LoadLevelError>;
  export function save_to_json(level: Level): string;
  export function make_wall(id: Int, x: Int, y: Int): Box;
  export function make_prop_box(id: Int, x: Int, y: Int, label: string): Box;
  export function make_implication_box(
    id: Int,
    x: Int,
    y: Int,
    premise: string,
    conclusion: string
  ): Box;
  export function make_and_box(
    id: Int,
    x: Int,
    y: Int,
    left: string,
    right: string
  ): Box;
  export function make_negation_box_with_inner(
    id: Int,
    x: Int,
    y: Int,
    inner: string
  ): Box;
  export function make_pi1_box(id: Int, x: Int, y: Int): Box;
  export function make_pi2_box(id: Int, x: Int, y: Int): Box;
  export function make_goal(x: Int, y: Int, prop: string): Goal;
  export function make_negation_box(id: Int, x: Int, y: Int): Box;
  export function compose_kind(raw: string): Result<Kind, KindParseError>;

  // play back related functions
  export function playback_frame(
    timeline: PlaybackTimeline,
    frame: Int
  ): Result<ViewModel, PlaybackError>;
}
