///|
const DEFAULT_LEVEL_ID : Int = 1

///|
const GRID : Int = 0x444444

///|
const PLAYER_FILL : Int = 0x222233

///|
const PLAYER_BORDER : Int = 0x00ffff

///|
const BOX_FILL : Int = 0x332222

///|
const BOX_BORDER : Int = 0xffa500

///|
const WALL_FILL : Int = 0x2c2c2c

///|
const WALL_BORDER : Int = 0x0f0f0f

///|
const GOAL : Int = 0x2ef5a0

///|
const GOAL_COMPLETE : Int = 0xf5d142

///|
const PROP_FILL : Int = 0x1f8a70

///|
const PROP_BORDER : Int = 0x4efee8

///|
const IMPLICATION_FILL : Int = 0x6a381f

///|
const AND_FILL : Int = 0x352070

///|
const AND_BORDER : Int = 0xb094ff

///|
const PI_FILL : Int = 0x0c3c7a

///|
fn build_level_one() -> Level {
  let json : Json = {
    "info": {
      "id": 1,
      "name": "Axiom",
      "description": "Move the box labeled 'A' to the goal 'A'.",
      "gridWidth": 5,
      "gridHeight": 3,
      "cellSize": 48,
    },
    "player": { "x": 0, "y": 1 },
    "boxes": [
      { "id": 1, "pos": { "x": 0, "y": 0 }, "kind": "Wall" },
      { "id": 2, "pos": { "x": 1, "y": 0 }, "kind": "Wall" },
      { "id": 3, "pos": { "x": 2, "y": 0 }, "kind": "Wall" },
      { "id": 4, "pos": { "x": 3, "y": 0 }, "kind": "Wall" },
      { "id": 5, "pos": { "x": 4, "y": 0 }, "kind": "Wall" },
      { "id": 6, "pos": { "x": 4, "y": 2 }, "kind": "Wall" },
      { "id": 7, "pos": { "x": 3, "y": 2 }, "kind": "Wall" },
      { "id": 8, "pos": { "x": 2, "y": 2 }, "kind": "Wall" },
      { "id": 9, "pos": { "x": 0, "y": 2 }, "kind": "Wall" },
      { "id": 10, "pos": { "x": 1, "y": 2 }, "kind": "Wall" },
      { "id": 11, "pos": { "x": 1, "y": 1 }, "kind": ["Prop", "A"] },
    ],
    "goals": [{ "pos": { "x": 4, "y": 1 }, "prop": ["Prop", "A"] }],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level_two() -> Level {
  let json : Json = {
    "info": {
      "id": 2,
      "name": "Introduction And",
      "description": "Combine boxes 'A' and 'B' by squashing them together to form 'A ∧ B'.",
      "gridWidth": 5,
      "gridHeight": 4,
      "cellSize": 48,
    },
    "player": { "x": 2, "y": 2 },
    "boxes": [
      { "id": 1, "pos": { "x": 0, "y": 3 }, "kind": "Wall" },
      { "id": 5, "pos": { "x": 4, "y": 2 }, "kind": "Wall" },
      { "id": 6, "pos": { "x": 4, "y": 1 }, "kind": "Wall" },
      { "id": 7, "pos": { "x": 4, "y": 3 }, "kind": "Wall" },
      { "id": 8, "pos": { "x": 4, "y": 0 }, "kind": "Wall" },
      { "id": 9, "pos": { "x": 3, "y": 0 }, "kind": "Wall" },
      { "id": 10, "pos": { "x": 1, "y": 0 }, "kind": "Wall" },
      { "id": 11, "pos": { "x": 2, "y": 0 }, "kind": "Wall" },
      { "id": 12, "pos": { "x": 2, "y": 1 }, "kind": ["Prop", "B"] },
      { "id": 13, "pos": { "x": 1, "y": 2 }, "kind": ["Prop", "A"] },
      { "id": 15, "pos": { "x": 3, "y": 3 }, "kind": "Wall" },
      { "id": 17, "pos": { "x": 0, "y": 0 }, "kind": "Wall" },
    ],
    "goals": [
      {
        "pos": { "x": 3, "y": 1 },
        "prop": ["And", ["Prop", "A"], ["Prop", "B"]],
      },
    ],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level_three() -> Level {
  let json : Json = {
    "info": {
      "id": 3,
      "name": "Implication",
      "description": "Use the implication box to derive 'X' from 'A'.",
      "gridWidth": 5,
      "gridHeight": 5,
      "cellSize": 48,
    },
    "player": { "x": 0, "y": 0 },
    "boxes": [
      {
        "id": 7,
        "pos": { "x": 1, "y": 2 },
        "kind": ["Implication", ["Prop", "A"], ["Prop", "X"]],
      },
      { "id": 8, "pos": { "x": 3, "y": 2 }, "kind": ["Prop", "A"] },
      { "id": 9, "pos": { "x": 2, "y": 2 }, "kind": "Wall" },
      { "id": 11, "pos": { "x": 4, "y": 1 }, "kind": "Wall" },
    ],
    "goals": [{ "pos": { "x": 2, "y": 1 }, "prop": ["Prop", "X"] }],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level_four() -> Level {
  let json : Json = {
    "info": {
      "id": 4,
      "name": "Composition",
      "description": "Implication can be composed!",
      "gridWidth": 6,
      "gridHeight": 5,
      "cellSize": 48,
    },
    "player": { "x": 2, "y": 2 },
    "boxes": [
      { "id": 1, "pos": { "x": 3, "y": 1 }, "kind": ["Prop", "A"] },
      {
        "id": 2,
        "pos": { "x": 1, "y": 2 },
        "kind": ["Implication", ["Prop", "A"], ["Prop", "B"]],
      },
      {
        "id": 3,
        "pos": { "x": 3, "y": 3 },
        "kind": ["Implication", ["Prop", "B"], ["Prop", "C"]],
      },
      { "id": 22, "pos": { "x": 0, "y": 0 }, "kind": "Wall" },
      { "id": 24, "pos": { "x": 2, "y": 0 }, "kind": "Wall" },
      { "id": 28, "pos": { "x": 1, "y": 3 }, "kind": "Wall" },
      { "id": 31, "pos": { "x": 4, "y": 2 }, "kind": "Wall" },
      { "id": 33, "pos": { "x": 4, "y": 1 }, "kind": "Wall" },
      { "id": 37, "pos": { "x": 1, "y": 0 }, "kind": "Wall" },
      { "id": 38, "pos": { "x": 0, "y": 3 }, "kind": "Wall" },
      { "id": 40, "pos": { "x": 1, "y": 4 }, "kind": "Wall" },
    ],
    "goals": [{ "pos": { "x": 4, "y": 3 }, "prop": ["Prop", "C"] }],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level5() -> Level {
  let json : Json = {
    "info": {
      "id": 5,
      "name": "Maze",
      "description": "Order does matter",
      "gridWidth": 7,
      "gridHeight": 7,
      "cellSize": 48,
    },
    "player": { "x": 5, "y": 3 },
    "boxes": [
      { "id": 1, "pos": { "x": 1, "y": 2 }, "kind": "Wall" },
      { "id": 2, "pos": { "x": 3, "y": 2 }, "kind": "Wall" },
      {
        "id": 3,
        "pos": { "x": 1, "y": 3 },
        "kind": [
          "Implication",
          ["Prop", "A"],
          [
            "Implication",
            ["Implication", ["Prop", "A"], ["Prop", "Y"]],
            ["Prop", "Z"],
          ],
        ],
      },
      {
        "id": 4,
        "pos": { "x": 2, "y": 3 },
        "kind": ["Implication", ["Prop", "A"], ["Prop", "Y"]],
      },
      { "id": 5, "pos": { "x": 4, "y": 3 }, "kind": ["Prop", "A"] },
      { "id": 6, "pos": { "x": 3, "y": 4 }, "kind": "Wall" },
      { "id": 16, "pos": { "x": 0, "y": 3 }, "kind": "Wall" },
      { "id": 19, "pos": { "x": 0, "y": 5 }, "kind": "Wall" },
      { "id": 21, "pos": { "x": 0, "y": 4 }, "kind": "Wall" },
      { "id": 24, "pos": { "x": 1, "y": 1 }, "kind": "Wall" },
      { "id": 25, "pos": { "x": 2, "y": 4 }, "kind": ["Prop", "Z"] },
      { "id": 26, "pos": { "x": 2, "y": 0 }, "kind": "Wall" },
      { "id": 27, "pos": { "x": 3, "y": 1 }, "kind": "Wall" },
      { "id": 29, "pos": { "x": 1, "y": 0 }, "kind": "Wall" },
      { "id": 30, "pos": { "x": 3, "y": 0 }, "kind": "Wall" },
      { "id": 31, "pos": { "x": 0, "y": 2 }, "kind": "Wall" },
      { "id": 35, "pos": { "x": 5, "y": 4 }, "kind": "Wall" },
      { "id": 37, "pos": { "x": 5, "y": 6 }, "kind": "Wall" },
      { "id": 38, "pos": { "x": 4, "y": 6 }, "kind": "Wall" },
      { "id": 39, "pos": { "x": 3, "y": 6 }, "kind": "Wall" },
      { "id": 42, "pos": { "x": 0, "y": 6 }, "kind": "Wall" },
      {
        "id": 45,
        "pos": { "x": 4, "y": 5 },
        "kind": ["Implication", ["Prop", "A"], ["Prop", "B"]],
      },
      {
        "id": 46,
        "pos": { "x": 1, "y": 5 },
        "kind": ["Implication", ["Prop", "B"], ["Prop", "A"]],
      },
      { "id": 48, "pos": { "x": 4, "y": 1 }, "kind": "Wall" },
      { "id": 49, "pos": { "x": 5, "y": 1 }, "kind": "Wall" },
      { "id": 51, "pos": { "x": 6, "y": 1 }, "kind": "Wall" },
      { "id": 52, "pos": { "x": 6, "y": 2 }, "kind": "Wall" },
    ],
    "goals": [{ "pos": { "x": 2, "y": 1 }, "prop": ["Prop", "Z"] }],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level6() -> Level {
  let json : Json = {
    "info": {
      "id": 6,
      "name": "Symmetry",
      "description": "And is not commutative by default.",
      "gridWidth": 8,
      "gridHeight": 7,
      "cellSize": 48,
    },
    "player": { "x": 3, "y": 0 },
    "boxes": [
      { "id": 1, "pos": { "x": 0, "y": 2 }, "kind": "Wall" },
      { "id": 2, "pos": { "x": 1, "y": 2 }, "kind": "Wall" },
      { "id": 3, "pos": { "x": 2, "y": 2 }, "kind": "Wall" },
      { "id": 4, "pos": { "x": 4, "y": 2 }, "kind": "Wall" },
      { "id": 5, "pos": { "x": 5, "y": 2 }, "kind": "Wall" },
      { "id": 6, "pos": { "x": 6, "y": 2 }, "kind": "Wall" },
      { "id": 7, "pos": { "x": 7, "y": 2 }, "kind": "Wall" },
      { "id": 8, "pos": { "x": 4, "y": 4 }, "kind": "Wall" },
      { "id": 9, "pos": { "x": 4, "y": 3 }, "kind": "Wall" },
      { "id": 10, "pos": { "x": 2, "y": 3 }, "kind": "Wall" },
      { "id": 11, "pos": { "x": 2, "y": 4 }, "kind": "Wall" },
      { "id": 12, "pos": { "x": 2, "y": 5 }, "kind": "Wall" },
      { "id": 14, "pos": { "x": 4, "y": 5 }, "kind": "Wall" },
      { "id": 15, "pos": { "x": 3, "y": 6 }, "kind": "Wall" },
      { "id": 16, "pos": { "x": 2, "y": 6 }, "kind": "Wall" },
      { "id": 17, "pos": { "x": 4, "y": 6 }, "kind": "Wall" },
      { "id": 18, "pos": { "x": 4, "y": 1 }, "kind": ["Prop", "A"] },
      { "id": 19, "pos": { "x": 1, "y": 1 }, "kind": ["Prop", "B"] },
      { "id": 20, "pos": { "x": 6, "y": 1 }, "kind": ["Prop", "C"] },
      {
        "id": 21,
        "pos": { "x": 2, "y": 1 },
        "kind": [
          "Implication",
          ["Prop", "Z"],
          ["And", ["Prop", "A"], ["Prop", "B"]],
        ],
      },
      {
        "id": 22,
        "pos": { "x": 5, "y": 1 },
        "kind": [
          "Implication",
          ["And", ["Prop", "C"], ["And", ["Prop", "B"], ["Prop", "A"]]],
          ["Prop", "Z"],
        ],
      },
    ],
    "goals": [
      {
        "pos": { "x": 3, "y": 5 },
        "prop": ["And", ["Prop", "A"], ["Prop", "B"]],
      },
    ],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level7() -> Level {
  let json : Json = {
    "info": {
      "id": 7,
      "name": "Elimination And",
      "description": "Extract components from an 'A ∧ B' box.",
      "gridWidth": 6,
      "gridHeight": 6,
      "cellSize": 48,
    },
    "player": { "x": 1, "y": 2 },
    "boxes": [
      { "id": 1, "pos": { "x": 0, "y": 0 }, "kind": "Wall" },
      { "id": 2, "pos": { "x": 1, "y": 0 }, "kind": "Wall" },
      { "id": 3, "pos": { "x": 2, "y": 0 }, "kind": "Wall" },
      { "id": 4, "pos": { "x": 3, "y": 0 }, "kind": "Wall" },
      { "id": 5, "pos": { "x": 4, "y": 0 }, "kind": "Wall" },
      { "id": 6, "pos": { "x": 5, "y": 0 }, "kind": "Wall" },
      { "id": 7, "pos": { "x": 5, "y": 1 }, "kind": "Wall" },
      { "id": 8, "pos": { "x": 5, "y": 2 }, "kind": "Wall" },
      { "id": 9, "pos": { "x": 5, "y": 4 }, "kind": "Wall" },
      { "id": 10, "pos": { "x": 5, "y": 3 }, "kind": "Wall" },
      { "id": 11, "pos": { "x": 5, "y": 5 }, "kind": "Wall" },
      { "id": 12, "pos": { "x": 4, "y": 5 }, "kind": "Wall" },
      { "id": 13, "pos": { "x": 3, "y": 5 }, "kind": "Wall" },
      { "id": 14, "pos": { "x": 2, "y": 5 }, "kind": "Wall" },
      { "id": 17, "pos": { "x": 0, "y": 4 }, "kind": "Wall" },
      { "id": 18, "pos": { "x": 0, "y": 3 }, "kind": "Wall" },
      { "id": 19, "pos": { "x": 0, "y": 2 }, "kind": "Wall" },
      { "id": 20, "pos": { "x": 0, "y": 1 }, "kind": "Wall" },
      { "id": 22, "pos": { "x": 3, "y": 2 }, "kind": "Wall" },
      {
        "id": 23,
        "pos": { "x": 2, "y": 2 },
        "kind": ["And", ["Prop", "A"], ["Prop", "B"]],
      },
      { "id": 25, "pos": { "x": 3, "y": 3 }, "kind": ["Snd", null] },
      { "id": 26, "pos": { "x": 2, "y": 1 }, "kind": ["Fst", null] },
      { "id": 27, "pos": { "x": 1, "y": 4 }, "kind": "Wall" },
      { "id": 28, "pos": { "x": 2, "y": 4 }, "kind": "Wall" },
    ],
    "goals": [{ "pos": { "x": 4, "y": 1 }, "prop": ["Prop", "B"] }],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
pub let pool : Map[Int, Level] = level_pool()

///|
fn level_pool() -> Map[Int, Level] {
  {
    1: build_level_one(),
    2: build_level_two(),
    3: build_level_three(),
    4: build_level_four(),
    5: build_level5(),
    6: build_level6(),
    7: build_level7(),
  }
}

fn get_description(levelId : Int) -> String {
  guard find_level(levelId) is Some(level) else { return "" }
  level.info.description
}

///|
pub fn enpool_level(level : Level) -> Unit {
  pool[level.info.id] = level
}

///|
fn find_level(levelId : Int) -> Level? {
  pool.get(levelId)
}

///|
pub fn level_seed(levelId : Int) -> Level? {
  guard find_level(levelId) is Some(seed) else { None }
  Some({
    info: seed.info,
    player: seed.player,
    boxes: seed.boxes.copy(),
    goals: seed.goals.copy(),
  })
}

///|
pub fn level_infos() -> Array[LevelInfo] {
  pool.iter().map(ilvl => ilvl.1.info).collect()
}

///|
pub fn default_level_id() -> Int {
  DEFAULT_LEVEL_ID
}
