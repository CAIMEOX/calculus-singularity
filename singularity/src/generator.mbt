///|
/// Move annotation returned alongside generated levels
pub struct Move {
  index : Int
  direction : String
  description : String
} derive(@json.FromJson, ToJson)

///|
pub impl Show for Move with output(self, f) {
  f.write_string("Move \{self.index}: \{self.direction} (\{self.description})")
}

///|
priv struct Solution {
  moves : Array[Direction]
  merges : Int
}

///|
priv struct GenerationShape {
  width : Int
  height : Int
  lanes : Int
  chainDepth : Int
  variantCount : Int
}

///|
const BASE_PLAYER_OFFSET : Int = 1

///|
const BASE_START_X : Int = 2

///|
/// Entry point for procedural level generation
pub fn generate(
  maxSize : Int,
  goals : Int,
  maxProps : Int,
  depth : Int,
) -> (Level, Array[Move]) {
  let shape = plan_shape(maxSize, goals, maxProps, depth)
  let mut attempt = 0
  let mut best : (Level, Solution, Int)? = None
  while attempt < shape.variantCount {
    let level = build_layout(shape, attempt)
    let depth_limit = compute_depth_limit(level, shape.chainDepth)
    let solutions = search_solutions(level, depth_limit, 3)
    let solution_count = solutions.length()
    if solution_count == 0 {
      attempt += 1
      continue
    }
    let primary = solutions[0]
    let candidate = (clone_level(level), primary, solution_count)
    best = pick_better(best, candidate)
    if solution_count == 1 && primary.merges >= shape.chainDepth * shape.lanes {
      break
    }
    attempt += 1
  }
  match best {
    Some((level, solution, _)) => {
      let annotated = annotate_moves(level, solution.moves)
      (level, annotated)
    }
    None => {
      let fallback = build_trivial_level()
      let solutions = search_solutions(fallback, 64, 1)
      let moves = if solutions.length() == 0 {
        Array::new()
      } else {
        annotate_moves(fallback, solutions[0].moves)
      }
      (fallback, moves)
    }
  }
}

///|
fn plan_shape(
  maxSize : Int,
  goals : Int,
  maxProps : Int,
  depth : Int,
) -> GenerationShape {
  let maxGoalLanes = @cmp.maximum(1, (maxSize - 2) / 2)
  let mut lanes = clamp_int(goals, 1, maxGoalLanes)
  let mut chainDepth = @cmp.maximum(1, depth)
  let mut width = compute_width(chainDepth)
  let mut height = compute_height(lanes)
  while (lanes * (chainDepth + 1) > maxProps || width > maxSize) &&
        chainDepth > 1 {
    chainDepth -= 1
    width = compute_width(chainDepth)
  }
  while (lanes * (chainDepth + 1) > maxProps || height > maxSize) && lanes > 1 {
    lanes -= 1
    height = compute_height(lanes)
  }
  if chainDepth < 1 {
    chainDepth = 1
    width = compute_width(chainDepth)
  }
  if lanes < 1 {
    lanes = 1
    height = compute_height(lanes)
  }
  let variantCount = @cmp.maximum(3, depth * 2)
  { width, height, lanes, chainDepth, variantCount }
}

///|
fn compute_width(chainDepth : Int) -> Int {
  let transfer_last = 5 + (chainDepth - 1) * 4
  transfer_last + 3
}

///|
fn compute_height(lanes : Int) -> Int {
  @cmp.maximum(4, lanes * 2 + 2)
}

///|
fn clamp_int(value : Int, low : Int, high : Int) -> Int {
  @cmp.maximum(low, @cmp.minimum(value, high))
}

///|
fn build_layout(shape : GenerationShape, variant : Int) -> Level {
  let gridWidth = shape.width
  let gridHeight = shape.height
  let boxes : Array[Box] = Array::new()
  let goals : Array[Goal] = Array::new()
  let mut nextId = 1
  nextId = add_boundary_columns(boxes, nextId, gridWidth, gridHeight)
  let mut label_index = 0
  let variant_shift = variant % 3
  let mut lane = 0
  while lane < shape.lanes {
    let working_row = 2 + lane * 2
    let start_x = BASE_START_X
    let (next_after_lane, next_label, goal) = build_lane(
      boxes,
      nextId,
      working_row,
      start_x,
      shape.chainDepth,
      label_index,
      gridWidth,
      gridHeight,
      variant_shift,
    )
    nextId = next_after_lane
    label_index = next_label
    goals.push(goal)
    lane += 1
  }
  let player_row = if shape.lanes > 0 { 2 } else { 1 }
  {
    info: {
      id: 9000 + variant,
      name: "Synthesized Proof \{variant + 1}",
      gridWidth,
      gridHeight,
      cellSize: 48,
      description: "",
    },
    player: { x: BASE_PLAYER_OFFSET, y: player_row },
    boxes,
    goals,
  }
}

///|
fn add_boundary_columns(
  boxes : Array[Box],
  startId : Int,
  width : Int,
  height : Int,
) -> Int {
  let mut nextId = startId
  let mut y = 0
  while y < height {
    boxes.push({ id: nextId, pos: { x: 0, y }, kind: Wall })
    nextId += 1
    boxes.push({ id: nextId, pos: { x: width - 1, y }, kind: Wall })
    nextId += 1
    y += 1
  }
  nextId
}

///|
fn build_lane(
  boxes : Array[Box],
  startId : Int,
  row : Int,
  start_x : Int,
  chainDepth : Int,
  label_index : Int,
  width : Int,
  height : Int,
  variant_shift : Int,
) -> (Int, Int, Goal) {
  let mut nextId = startId
  let mut labelCursor = label_index
  let mut current_label = make_label(labelCursor)
  labelCursor += 1
  let mut prop_x = start_x
  boxes.push({
    id: nextId,
    pos: { x: prop_x, y: row },
    kind: Prop(current_label),
  })
  nextId += 1
  let mut step = 0
  while step < chainDepth {
    let target_label = make_label(labelCursor)
    labelCursor += 1
    let rule_x = prop_x + 1
    boxes.push({
      id: nextId,
      pos: { x: rule_x, y: row },
      kind: Implication(Prop(current_label), Prop(target_label)),
    })
    nextId += 1
    let barrier_x = prop_x + 2
    if barrier_x < width - 1 {
      boxes.push({ id: nextId, pos: { x: barrier_x, y: row }, kind: Wall })
      nextId += 1
    }
    if variant_shift % 2 == 1 {
      let obstacle_row = row + (if step % 2 == 0 { 1 } else { -1 })
      if obstacle_row >= 0 && obstacle_row < height && barrier_x < width - 1 {
        boxes.push({
          id: nextId,
          pos: { x: barrier_x, y: obstacle_row },
          kind: And(Prop(current_label), Prop(target_label)),
        })
        nextId += 1
      }
    }
    current_label = target_label
    prop_x += 4
    step += 1
  }
  let goal_x = @cmp.minimum(width - 2, prop_x - 1)
  (
    nextId,
    labelCursor,
    { pos: { x: goal_x, y: row }, prop: Prop(current_label) },
  )
}

///|
fn make_label(idx : Int) -> String {
  let base = idx % 26
  let suffix = idx / 26
  let ch = ('A'.to_int() + base).unsafe_to_char()
  let mut label = String::make(1, ch)
  if suffix > 0 {
    label += suffix.to_string()
  }
  label
}

///|
fn clone_level(level : Level) -> Level {
  {
    info: level.info,
    player: level.player,
    boxes: level.boxes.copy(),
    goals: level.goals.copy(),
  }
}

///|
fn compute_depth_limit(level : Level, chainDepth : Int) -> Int {
  let base = level.info.gridWidth * level.info.gridHeight
  @cmp.maximum(32, (chainDepth + 1) * base)
}

///|
fn pick_better(
  current : (Level, Solution, Int)?,
  candidate : (Level, Solution, Int),
) -> (Level, Solution, Int)? {
  match current {
    None => Some(candidate)
    Some(existing) => {
      let (_, best_solution, best_paths) = existing
      let score_existing = score_solution(best_solution, best_paths)
      let (_, challenger_solution, challenger_paths) = candidate
      let score_candidate = score_solution(
        challenger_solution, challenger_paths,
      )
      if score_candidate > score_existing {
        Some(candidate)
      } else {
        current
      }
    }
  }
}

///|
fn score_solution(solution : Solution, path_count : Int) -> Int {
  let uniqueness = if path_count == 1 {
    2000
  } else if path_count == 2 {
    1200
  } else {
    0
  }
  let merge_score = solution.merges * 300
  let path_score = solution.moves.length() * 10
  uniqueness + merge_score + path_score - (path_count - 1) * 50
}

///|
fn build_trivial_level() -> Level {
  let boxes : Array[Box] = Array::new()
  boxes.push({ id: 1, pos: { x: 0, y: 1 }, kind: Wall })
  boxes.push({ id: 2, pos: { x: 4, y: 1 }, kind: Wall })
  boxes.push({ id: 3, pos: { x: 1, y: 1 }, kind: Prop("A") })
  boxes.push({
    id: 4,
    pos: { x: 2, y: 1 },
    kind: Implication(Prop("A"), Prop("B")),
  })
  boxes.push({ id: 5, pos: { x: 3, y: 1 }, kind: Wall })
  {
    info: {
      id: 9999,
      name: "Fallback Lemma",
      description: "",
      gridWidth: 5,
      gridHeight: 3,
      cellSize: 48,
    },
    player: { x: 1, y: 1 },
    boxes,
    goals: [{ pos: { x: 3, y: 1 }, prop: Prop("B") }],
  }
}

///|
fn annotate_moves(level : Level, path : Array[Direction]) -> Array[Move] {
  let annotated : Array[Move] = Array::new()
  let mut idx = 0
  let mut model = build_model(level)
  while idx < path.length() {
    let direction = path[idx]
    let next_model = clone_model(model).step(direction)
    annotated.push({
      index: idx + 1,
      direction: direction_label(direction),
      description: describe_move(direction, detect_merge(model, next_model)),
    })
    model = next_model
    idx += 1
  }
  annotated
}

///|
fn describe_move(direction : Direction, merged : Bool) -> String {
  let dir = direction_label(direction)
  if merged {
    "\{dir} — merge"
  } else {
    "\{dir} — move"
  }
}

///|
fn direction_label(direction : Direction) -> String {
  match direction {
    Up => "Up"
    Down => "Down"
    Left => "Left"
    Right => "Right"
  }
}

///|
fn search_solutions(
  level : Level,
  depth_limit : Int,
  max_paths : Int,
) -> Array[Solution] {
  let solutions : Array[Solution] = Array::new()
  let queue : Array[(Model, Array[Direction], Int)] = Array::new()
  let start_model = build_model(level)
  queue.push((start_model, Array::new(), 0))
  let visited : Array[String] = Array::new()
  visited.push(encode_model(start_model))
  let mut cursor = 0
  while cursor < queue.length() && solutions.length() < max_paths {
    let (current, history, mergeCount) = queue[cursor]
    cursor += 1
    if history.length() > depth_limit {
      continue
    }
    if model_goals_completed(current) {
      solutions.push({ moves: history, merges: mergeCount })
      continue
    }
    let mut dirIdx = 0
    while dirIdx < 4 {
      let direction = match dirIdx {
        0 => Up
        1 => Down
        2 => Left
        _ => Right
      }
      let next_model = clone_model(current).step(direction)
      if same_state(current, next_model) {
        dirIdx += 1
        continue
      }
      let key = encode_model(next_model)
      if contains_state(visited, key) {
        dirIdx += 1
        continue
      }
      visited.push(key)
      let next_history = history.copy()
      next_history.push(direction)
      let extra = if detect_merge(current, next_model) { 1 } else { 0 }
      queue.push((next_model, next_history, mergeCount + extra))
      dirIdx += 1
    }
  }
  solutions
}

///|
fn contains_state(visited : Array[String], key : String) -> Bool {
  for entry in visited {
    if entry == key {
      return true
    }
  }
  false
}

///|
fn encode_model(model : Model) -> String {
  let builder = StringBuilder::new(size_hint=model.boxes.length() * 8)
  builder.write_string("\{model.player.x}:\{model.player.y}|")
  let sorted = sort_boxes(model.boxes)
  for box in sorted {
    builder.write_string(
      "\{box.id}@\{box.pos.x},\{box.pos.y}=\{kind_to_string(box.kind)};",
    )
  }
  builder.to_string()
}

///|
fn sort_boxes(boxes : Array[Box]) -> Array[Box] {
  let sorted = boxes.copy()
  let len = sorted.length()
  let mut i = 1
  while i < len {
    let mut j = i
    while j > 0 && sorted[j - 1].id > sorted[j].id {
      let temp = sorted[j - 1]
      sorted[j - 1] = sorted[j]
      sorted[j] = temp
      j -= 1
    }
    i += 1
  }
  sorted
}

///|
fn clone_model(model : Model) -> Model {
  {
    player: model.player,
    boxes: model.boxes.copy(),
    hoveredBoxId: model.hoveredBoxId,
    gridWidth: model.gridWidth,
    gridHeight: model.gridHeight,
    cellSize: model.cellSize,
    goals: model.goals.copy(),
    history: model.history.copy(),
    isComplete: model.isComplete,
    backups: model.backups.copy(),
    activeBackupId: model.activeBackupId,
    nextBackupId: model.nextBackupId,
    levelId: model.levelId,
    levelName: model.levelName,
  }
}

///|
fn same_state(lhs : Model, rhs : Model) -> Bool {
  lhs.player.x == rhs.player.x &&
  lhs.player.y == rhs.player.y &&
  boxes_equal(lhs.boxes, rhs.boxes)
}

///|
fn boxes_equal(lhs : Array[Box], rhs : Array[Box]) -> Bool {
  if lhs.length() != rhs.length() {
    return false
  }
  let left_sorted = sort_boxes(lhs)
  let right_sorted = sort_boxes(rhs)
  let len = left_sorted.length()
  let mut idx = 0
  while idx < len {
    let left_box = left_sorted[idx]
    let right_box = right_sorted[idx]
    if left_box.id != right_box.id ||
      left_box.pos.x != right_box.pos.x ||
      left_box.pos.y != right_box.pos.y ||
      left_box.kind != right_box.kind {
      return false
    }
    idx += 1
  }
  true
}

///|
fn model_goals_completed(model : Model) -> Bool {
  model.goals
  .iter()
  .all(goal => model_find_box(model.boxes, goal.pos) is Some(box) &&
    box.kind == goal.prop)
}

///|
fn model_find_box(boxes : Array[Box], pos : Vector) -> Box? {
  for box in boxes {
    if box.pos.x == pos.x && box.pos.y == pos.y {
      return Some(box)
    }
  }
  None
}

///|
fn detect_merge(previous : Model, next : Model) -> Bool {
  next.boxes.length() < previous.boxes.length()
}
