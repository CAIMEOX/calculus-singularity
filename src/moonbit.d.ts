declare module "../singularity/target/js/release/build/cs.js" {
  export function init_model(): unknown;
  export function move_with_key(model: unknown, key: string): unknown;
  export function hover_box(model: unknown, boxId: number): unknown;
  export function clear_hover(model: unknown): unknown;
  export function undo(model: unknown): unknown;
  export function view(model: unknown): any;
}
