declare module "../singularity/target/js/release/build/cs.js" {
  export function init_model(): unknown;
  export function init_model_for(levelId: number): unknown;
  export function move_with_key(model: unknown, key: string): unknown;
  export function hover_box(model: unknown, boxId: number): unknown;
  export function clear_hover(model: unknown): unknown;
  export function undo(model: unknown): unknown;
  export function save_backup(model: unknown, timestamp: number): unknown;
  export function list_backups(model: unknown): any;
  export function get_active_backup_meta(model: unknown): any;
  export function restore_backup(model: unknown, backupId: number): unknown;
  export function view(model: unknown): any;
  export function generate_panel_content(model: unknown): string;
  export function level_infos(): any;
}
