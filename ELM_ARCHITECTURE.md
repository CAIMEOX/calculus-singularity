# ELM Architecture Implementation

The project now follows the Elm Architecture with the **Model / Update** loop implemented in Moonbit and the TypeScript front-end reduced to rendering responsibilities only.

## Core Pieces

### Moonbit Model (`singularity/src/model.mbt`)

```moonbit
pub struct Model {
  player : Vector
  boxes : Array[Box]
  hoveredBoxId : Int?
  gridSize : Int
  cellSize : Int
}
```

- The single source of truth for the game.
- `Model::step` encapsulates all Sokoban-style movement and collision rules.
- Utility helpers (`move_with_key`, `hover_box`, `clear_hover`, `view`, `init_model`) are exported via `moon build --target js` and consumed directly from `../singularity/target/js/release/build/cs.js`.
- `view(model)` returns a JSON-friendly snapshot (`ViewModel`) that the renderer can safely consume.

### TypeScript Renderer (`src/main.ts`)

- Holds an opaque `coreModel` reference returned by `init_model`.
- Converts Moonbit snapshots into PIXI updates + info panel rendering.
- Forwards DOM/PIXI events to Moonbit helpers and re-renders with the latest snapshot.
- Contains no game logic; it only knows how to display the `ViewModel`.

### Shared View Types (`src/types.ts`)

```ts
export interface ViewModel {
  player: Vector2;
  boxes: BoxView[];
  hoveredBoxId: number | null | undefined;
  gridSize: number;
  cellSize: number;
}
```

- Used by both `src/main.ts` and `src/infoPanel.ts` for type-safe rendering.
- Generated from Moonbit data via `moonView(coreModel)`.

### Info Panel (`src/infoPanel.ts`) & Box View (`src/box.ts`)

- Pure view helpers that render the `ViewModel`.
- Never mutate or inspect the Moonbit model directly.

## Why This Matters

- **Predictability** – All state mutations happen inside Moonbit’s `Model::step`. TypeScript always renders immutable snapshots.
- **Testability** – Core rules now live in a single functional module that can be exercised purely in Moonbit.
- **Maintainability** – Clear contract between logic (Moonbit) and presentation (TypeScript). Adding new actions only requires exporting another helper.
- **Interop via JSON** – The snapshot returned by `view(model)` is composed of plain records/arrays, so JS can `JSON.stringify` it or inspect it freely.

## Message Flow

```
User Input (keyboard / hover)
        ↓
Moonbit helper (move_with_key / hover_box / clear_hover)
        ↓
Model::step runs inside Moonbit
        ↓
moonView(model) → ViewModel snapshot (JSON-friendly)
        ↓
PIXI + DOM rendering in TypeScript
```

## Working With The Runtime

1. Edit Moonbit sources under `singularity/src`.
2. Rebuild the runtime: `moon build --target js`.
3. Import the generated helpers in TypeScript (`../singularity/target/js/release/build/cs.js`).
4. Render using the latest snapshot from `view(model)`.

## Extending The Game

1. Update the Moonbit `Model` / `Box` / helper functions to include the new state or rules.
2. Export a new function (e.g., `trigger_spell`) alongside the existing helpers.
3. Rebuild with `moon build --target js`.
4. Call the new helper from TypeScript and render any additional fields exposed in the `ViewModel`.
