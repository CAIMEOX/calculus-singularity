///|
const DEFAULT_LEVEL_ID : Int = 1

///|
fn build_level1() -> Level {
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
fn build_level2() -> Level {
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
fn build_level3() -> Level {
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
fn build_level4() -> Level {
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
fn build_level8() -> Level {
  let json : Json = {
    "info": {
      "id": 8,
      "name": "Associativity",
      "description": "Proposition as resource.",
      "gridWidth": 6,
      "gridHeight": 5,
      "cellSize": 48,
    },
    "player": { "x": 2, "y": 1 },
    "boxes": [
      {
        "id": 2,
        "pos": { "x": 2, "y": 2 },
        "kind": ["And", ["And", ["Prop", "A"], ["Prop", "B"]], ["Prop", "C"]],
      },
      { "id": 3, "pos": { "x": 1, "y": 3 }, "kind": ["Fst", null] },
      { "id": 4, "pos": { "x": 3, "y": 3 }, "kind": ["Snd", null] },
      { "id": 7, "pos": { "x": 3, "y": 0 }, "kind": ["Prop", "C"] },
      {
        "id": 8,
        "pos": { "x": 1, "y": 0 },
        "kind": ["And", ["And", ["Prop", "A"], ["Prop", "C"]], ["Prop", "B"]],
      },
      { "id": 9, "pos": { "x": 1, "y": 1 }, "kind": ["Fst", null] },
      { "id": 14, "pos": { "x": 5, "y": 3 }, "kind": "Wall" },
      { "id": 15, "pos": { "x": 0, "y": 3 }, "kind": "Wall" },
      { "id": 16, "pos": { "x": 5, "y": 0 }, "kind": "Wall" },
      { "id": 17, "pos": { "x": 5, "y": 1 }, "kind": "Wall" },
      { "id": 18, "pos": { "x": 5, "y": 2 }, "kind": "Wall" },
      { "id": 19, "pos": { "x": 5, "y": 4 }, "kind": "Wall" },
      { "id": 20, "pos": { "x": 0, "y": 4 }, "kind": "Wall" },
      { "id": 22, "pos": { "x": 4, "y": 1 }, "kind": "Wall" },
    ],
    "goals": [
      {
        "pos": { "x": 4, "y": 0 },
        "prop": ["And", ["Prop", "A"], ["And", ["Prop", "B"], ["Prop", "C"]]],
      },
    ],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level9() -> Level {
  let json : Json = {
    "info": {
      "id": 9,
      "name": "Introduction Negation",
      "description": "¬ box can be combined with other box.",
      "gridWidth": 3,
      "gridHeight": 4,
      "cellSize": 48,
    },
    "player": { "x": 2, "y": 3 },
    "boxes": [
      { "id": 1, "pos": { "x": 1, "y": 1 }, "kind": ["Neg", null] },
      { "id": 2, "pos": { "x": 0, "y": 2 }, "kind": ["Prop", "A"] },
      { "id": 3, "pos": { "x": 2, "y": 2 }, "kind": ["Prop", "B"] },
      { "id": 10, "pos": { "x": 1, "y": 0 }, "kind": "Wall" },
      { "id": 11, "pos": { "x": 0, "y": 0 }, "kind": "Wall" },
      { "id": 12, "pos": { "x": 2, "y": 1 }, "kind": ["Prop", "A"] },
    ],
    "goals": [{ "pos": { "x": 0, "y": 1 }, "prop": ["Neg", [["Prop", "A"]]] }],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
fn build_level10() -> Level {
  let json : Json = {
    "info": {
      "id": 10,
      "name": "Double Negation",
      "description": "¬(¬A) is not equivalent to A",
      "gridWidth": 6,
      "gridHeight": 5,
      "cellSize": 48,
    },
    "player": { "x": 0, "y": 2 },
    "boxes": [
      {
        "id": 1,
        "pos": { "x": 2, "y": 1 },
        "kind": [
          "Implication",
          ["Prop", "P"],
          ["Neg", [["And", ["Neg", [["Prop", "A"]]], ["Neg", [["Prop", "B"]]]]]],
        ],
      },
      { "id": 2, "pos": { "x": 2, "y": 2 }, "kind": ["Neg", null] },
      { "id": 5, "pos": { "x": 3, "y": 3 }, "kind": "Wall" },
      { "id": 6, "pos": { "x": 1, "y": 1 }, "kind": "Wall" },
      { "id": 8, "pos": { "x": 1, "y": 2 }, "kind": ["Prop", "P"] },
      {
        "id": 10,
        "pos": { "x": 4, "y": 3 },
        "kind": [
          "Implication",
          [
            "Neg",
            [
              [
                "Neg",
                [["And", ["Neg", [["Prop", "A"]]], ["Neg", [["Prop", "B"]]]]],
              ],
            ],
          ],
          ["Prop", "Q"],
        ],
      },
      {
        "id": 12,
        "pos": { "x": 2, "y": 3 },
        "kind": [
          "Implication",
          ["And", ["Neg", [["Prop", "A"]]], ["Neg", [["Prop", "B"]]]],
          ["Prop", "Q"],
        ],
      },
      { "id": 15, "pos": { "x": 0, "y": 4 }, "kind": "Wall" },
      { "id": 23, "pos": { "x": 5, "y": 2 }, "kind": "Wall" },
      { "id": 25, "pos": { "x": 0, "y": 3 }, "kind": "Wall" },
    ],
    "goals": [{ "pos": { "x": 4, "y": 1 }, "prop": ["Prop", "Q"] }],
  }
  (try? @json.from_json(json)).unwrap()
}

///|
pub let pool : Map[Int, Level] = level_pool()

///|
fn level_pool() -> Map[Int, Level] {
  {
    1: build_level1(),
    2: build_level2(),
    3: build_level3(),
    4: build_level4(),
    5: build_level5(),
    6: build_level6(),
    7: build_level7(),
    8: build_level8(),
    9: build_level9(),
    10: build_level10(),
  }
}

///|
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
