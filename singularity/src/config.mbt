///|
pub struct LevelInfo {
  id : Int
  name : String
  gridWidth : Int
  gridHeight : Int
  cellSize : Int
}

///|
pub struct LevelSeed {
  info : LevelInfo
  player : Vector
  boxes : Array[Box]
  goals : Array[Vector]
}

const DEFAULT_LEVEL_ID : Int = 1

///|
fn make_int_box(id : Int, x : Int, y : Int, value : Int) -> Box {
  { id, pos: { x, y }, kind: Int(value) }
}

///|
fn make_wall(id : Int, x : Int, y : Int) -> Box {
  { id, pos: { x, y }, kind: Wall }
}

///|
fn make_goal(x : Int, y : Int) -> Vector {
  { x, y }
}

///|
fn clone_boxes(source : Array[Box]) -> Array[Box] {
  let len = source.length()
  let boxes = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    let box = source[i]
    boxes.push({ id: box.id, pos: box.pos, kind: box.kind })
    i += 1
  }
  boxes
}

///|
fn clone_goals(source : Array[Vector]) -> Array[Vector] {
  let len = source.length()
  let goals = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    let goal = source[i]
    goals.push(goal)
    i += 1
  }
  goals
}

///|
fn build_level_one() -> LevelSeed {
  let boxes : Array[Box] = Array::new(capacity=6)
  boxes.push(make_int_box(1, 2, 2, 3))
  boxes.push(make_int_box(2, 3, 2, 7))
  boxes.push(make_int_box(3, 3, 3, 1))
  boxes.push(make_wall(4, 5, 5))
  boxes.push(make_wall(5, 6, 5))
  boxes.push(make_wall(6, 7, 5))

  let goals : Array[Vector] = Array::new(capacity=3)
  goals.push(make_goal(8, 2))
  goals.push(make_goal(8, 3))
  goals.push(make_goal(8, 4))

  {
    info: {
      id: 1,
      name: "入门演算",
      gridWidth: 10,
      gridHeight: 10,
      cellSize: 50,
    },
    player: { x: 1, y: 1 },
    boxes,
    goals,
  }
}

///|
fn build_level_two() -> LevelSeed {
  let boxes : Array[Box] = Array::new(capacity=7)
  boxes.push(make_int_box(1, 1, 5, 2))
  boxes.push(make_int_box(2, 2, 5, 5))
  boxes.push(make_int_box(3, 3, 5, 1))
  boxes.push(make_int_box(4, 2, 3, 4))
  boxes.push(make_wall(5, 5, 2))
  boxes.push(make_wall(6, 5, 3))
  boxes.push(make_wall(7, 5, 4))

  let goals : Array[Vector] = Array::new(capacity=4)
  goals.push(make_goal(7, 2))
  goals.push(make_goal(7, 3))
  goals.push(make_goal(7, 4))
  goals.push(make_goal(7, 5))

  {
    info: {
      id: 2,
      name: "组合归约",
      gridWidth: 12,
      gridHeight: 8,
      cellSize: 48,
    },
    player: { x: 0, y: 4 },
    boxes,
    goals,
  }
}

///|
fn build_level_three() -> LevelSeed {
  let boxes : Array[Box] = Array::new(capacity=9)
  boxes.push(make_int_box(1, 4, 2, 8))
  boxes.push(make_int_box(2, 5, 2, 3))
  boxes.push(make_int_box(3, 4, 3, 1))
  boxes.push(make_int_box(4, 5, 3, 6))
  boxes.push(make_wall(5, 2, 5))
  boxes.push(make_wall(6, 3, 5))
  boxes.push(make_wall(7, 4, 5))
  boxes.push(make_wall(8, 5, 5))
  boxes.push(make_wall(9, 6, 5))

  let goals : Array[Vector] = Array::new(capacity=3)
  goals.push(make_goal(8, 1))
  goals.push(make_goal(8, 2))
  goals.push(make_goal(8, 3))

  {
    info: {
      id: 3,
      name: "折叠与展开",
      gridWidth: 14,
      gridHeight: 10,
      cellSize: 46,
    },
    player: { x: 2, y: 2 },
    boxes,
    goals,
  }
}

///|
fn level_pool() -> Array[LevelSeed] {
  let levels : Array[LevelSeed] = Array::new(capacity=3)
  levels.push(build_level_one())
  levels.push(build_level_two())
  levels.push(build_level_three())
  levels
}

///|
fn find_level(levelId : Int) -> LevelSeed {
  let levels = level_pool()
  let len = levels.length()
  let mut i = 0
  while i < len {
    let level = levels[i]
    if level.info.id == levelId {
      return level
    }
    i += 1
  }
  levels[0]
}

///|
pub fn level_seed(levelId : Int) -> LevelSeed {
  let seed = find_level(levelId)
  {
    info: seed.info,
    player: seed.player,
    boxes: clone_boxes(seed.boxes),
    goals: clone_goals(seed.goals),
  }
}

///|
pub fn level_infos() -> Array[LevelInfo] {
  level_pool().map(level => level.info)
}

///|
pub fn default_level_id() -> Int {
  DEFAULT_LEVEL_ID
}
