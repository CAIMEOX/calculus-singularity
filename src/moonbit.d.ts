import {
  Kind,
  CoreModel as Model,
  ViewModel,
  InfoPanelData,
} from "./types";

declare module "../singularity/target/js/release/build/cs.js" {
  export function init_model(): Model;
  export function init_model_for(levelId: number): Model;
  export function move_with_key(model: Model, key: string): Model;
  export function hover_box(model: Model, boxId: number): Model;
  export function clear_hover(model: Model): Model;
  export function undo(model: Model): Model;
  export function save_backup(model: Model, timestamp: number): Model;
  export function list_backups(model: Model): any;
  export function get_active_backup_meta(model: unknown): any;
  export function restore_backup(model: Model, backupId: number): Model;
  export function view(model: Model): ViewModel;
  export function generate_panel_content(model: Model): InfoPanelData;
  export function level_infos(): any;
  export function style_for_kind(kind: Kind, cellSize: number): any;
  export function load_from_json(json: string): any;
  export function save_to_json(level: unknown): string;
  export function make_wall(id: number, x: number, y: number): any;
  export function make_prop_box(
    id: number,
    x: number,
    y: number,
    label: string
  ): any;
  export function make_implication_box(
    id: number,
    x: number,
    y: number,
    premise: string,
    conclusion: string
  ): any;
  export function make_and_box(
    id: number,
    x: number,
    y: number,
    left: string,
    right: string
  ): any;
  export function make_pi1_box(id: number, x: number, y: number): any;
  export function make_pi2_box(id: number, x: number, y: number): any;
  export function make_goal(x: number, y: number, prop: string): any;
  export function make_negation_box(id: number, x: number, y: number): any;
  export function make_negation_box_with_inner(
    id: number,
    x: number,
    y: number,
    inner: string
  ): any;
  export function compose_kind(raw: string): any;
  export function generate(
    maxSize: number,
    goals: number,
    maxProps: number,
    depth: number
  ): any;
}
