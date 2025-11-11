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
  let boxes : Array[Box] = Array::new(capacity=8)
  boxes.push(make_prop_box(1, 2, 2, "A"))
  boxes.push(make_implication_box(2, 3, 2, "A", "B"))
  boxes.push(make_prop_box(3, 1, 4, "C"))
  boxes.push(make_implication_box(4, 2, 4, "C", "A"))
  boxes.push(make_wall(5, 6, 1))
  boxes.push(make_wall(6, 6, 2))
  boxes.push(make_wall(7, 6, 3))
  boxes.push(make_prop_box(8, 4, 5, "A"))
  let goals : Array[Goal] = Array::new(capacity=1)
  goals.push(make_goal(9, 2, "B"))
  {
    info: {
      id: 1,
      name: "命题觉醒",
      gridWidth: 12,
      gridHeight: 8,
      cellSize: 48,
    },
    player: { x: 1, y: 1 },
    boxes,
    goals,
  }
}

///|
fn build_level_two() -> Level {
  let boxes : Array[Box] = Array::new(capacity=11)
  boxes.push(make_prop_box(1, 2, 5, "A"))
  boxes.push(make_prop_box(2, 3, 5, "B"))
  boxes.push(make_prop_box(3, 2, 3, "A"))
  boxes.push(make_prop_box(4, 3, 3, "B"))
  boxes.push(make_pi1_box(5, 6, 4))
  boxes.push(make_pi2_box(6, 7, 4))
  boxes.push(make_implication_box(7, 4, 6, "B", "C"))
  boxes.push(make_prop_box(8, 5, 6, "C"))
  boxes.push(make_wall(9, 5, 2))
  boxes.push(make_wall(10, 5, 3))
  boxes.push(make_wall(11, 5, 4))
  let goals : Array[Goal] = Array::new(capacity=2)
  goals.push(make_goal(10, 3, "A"))
  goals.push(make_goal(10, 4, "B"))
  {
    info: {
      id: 2,
      name: "合取演算",
      gridWidth: 12,
      gridHeight: 10,
      cellSize: 46,
    },
    player: { x: 1, y: 4 },
    boxes,
    goals,
  }
}

///|
fn build_level_three() -> Level {
  let boxes : Array[Box] = Array::new(capacity=13)
  boxes.push(make_prop_box(1, 3, 3, "A"))
  boxes.push(make_implication_box(2, 4, 3, "A", "B"))
  boxes.push(make_implication_box(3, 5, 3, "B", "C"))
  boxes.push(make_prop_box(4, 2, 6, "D"))
  boxes.push(make_prop_box(5, 3, 6, "E"))
  boxes.push(make_and_box(6, 7, 5, "D", "E"))
  boxes.push(make_pi1_box(7, 9, 4))
  boxes.push(make_pi2_box(8, 9, 6))
  boxes.push(make_implication_box(9, 6, 2, "C", "F"))
  boxes.push(make_prop_box(10, 4, 7, "F"))
  boxes.push(make_wall(11, 6, 4))
  boxes.push(make_wall(12, 6, 5))
  boxes.push(make_wall(13, 6, 6))
  let goals : Array[Goal] = Array::new(capacity=3)
  goals.push(make_goal(11, 3, "C"))
  goals.push(make_goal(12, 5, "D"))
  goals.push(make_goal(12, 6, "E"))
  {
    info: {
      id: 3,
      name: "演绎乐章",
      gridWidth: 14,
      gridHeight: 10,
      cellSize: 44,
    },
    player: { x: 1, y: 2 },
    boxes,
    goals,
  }
}

///|
fn level_pool() -> Array[Level] {
  let levels : Array[Level] = Array::new(capacity=3)
  levels.push(build_level_one())
  levels.push(build_level_two())
  levels.push(build_level_three())
  levels
}

///|
fn find_level(levelId : Int) -> Level {
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
pub fn level_seed(levelId : Int) -> Level {
  let seed = find_level(levelId)
  {
    info: seed.info,
    player: seed.player,
    boxes: seed.boxes.copy(),
    goals: seed.goals.copy(),
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
