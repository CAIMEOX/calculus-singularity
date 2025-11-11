///|
/// Map DOM keyboard input to logical directions
fn Direction::from_key(key : String) -> Direction? {
  match key {
    "ArrowUp" | "w" => Some(Up)
    "ArrowDown" | "s" => Some(Down)
    "ArrowLeft" | "a" => Some(Left)
    "ArrowRight" | "d" => Some(Right)
    _ => None
  }
}

///|
/// Initialize the core model
pub fn init_model() -> Model {
  let boxes = seed_boxes()
  let goals = seed_goals()
  {
    player: { x: 1, y: 1 },
    boxes,
    hoveredBoxId: None,
    gridSize: default_grid_size(),
    cellSize: default_cell_size(),
    goals,
    history: Array::new(),
    isComplete: goals_completed(boxes, goals),
    backups: Array::new(),
    activeBackupId: None,
    nextBackupId: 0,
  }
}

///|
/// Entry point for keyboard events coming from the Pixi layer
pub fn move_with_key(model : Model, key : String) -> Model {
  match Direction::from_key(key) {
    Some(direction) => model.step(direction)
    None => model
  }
}

///|
/// Hover handler used by Box mouse events
pub fn hover_box(model : Model, boxId : Int) -> Model {
  if has_box(model.boxes, boxId) {
    {
      player: model.player,
      boxes: model.boxes,
      hoveredBoxId: Some(boxId),
      gridSize: model.gridSize,
      cellSize: model.cellSize,
      history: model.history,
      goals: model.goals,
      isComplete: model.isComplete,
      backups: model.backups,
      activeBackupId: model.activeBackupId,
      nextBackupId: model.nextBackupId,
    }
  } else {
    model
  }
}

///|
/// Reset hover state when the mouse leaves a box
pub fn clear_hover(model : Model) -> Model {
  {
    player: model.player,
    boxes: model.boxes,
    hoveredBoxId: None,
    gridSize: model.gridSize,
    cellSize: model.cellSize,
    history: model.history,
    goals: model.goals,
    isComplete: model.isComplete,
    backups: model.backups,
    activeBackupId: model.activeBackupId,
    nextBackupId: model.nextBackupId,
  }
}

///|
/// Pure View function that exposes data for rendering
pub fn view(model : Model) -> ViewModel {
  {
    player: model.player,
    boxes: build_box_views(model.boxes),
    hoveredBoxId: model.hoveredBoxId,
    gridSize: model.gridSize,
    cellSize: model.cellSize,
    goals: clone_vectors(model.goals),
    isComplete: model.isComplete,
  }
}

///|
/// Core Elm update logic, implemented in Moonbit
pub fn Model::step(self : Model, direction : Direction) -> Model {
  let nextPlayer = calculate_next_position(self.player, direction)
  if !is_in_bounds(nextPlayer, self.gridSize) {
    self
  } else {
    match find_box_at_position(self.boxes, nextPlayer) {
      None => {
        let history = append_snapshot(self.history, self.player, self.boxes)
        {
          player: nextPlayer,
          boxes: self.boxes,
          hoveredBoxId: self.hoveredBoxId,
          gridSize: self.gridSize,
          cellSize: self.cellSize,
          history,
          goals: self.goals,
          isComplete: self.isComplete,
          backups: self.backups,
          activeBackupId: self.activeBackupId,
          nextBackupId: self.nextBackupId,
        }
      }
      Some(box) => {
        let (chain, landing, blocked) = collect_box_chain(
          self.boxes,
          box.pos,
          direction,
        )
        if blocked || !is_in_bounds(landing, self.gridSize) {
          let (merged_boxes, merged) = merge_chain_if_possible(
            self.boxes,
            chain,
          )
          if merged {
            let history = append_snapshot(self.history, self.player, self.boxes)
            {
              player: nextPlayer,
              boxes: merged_boxes,
              hoveredBoxId: None,
              gridSize: self.gridSize,
              cellSize: self.cellSize,
              history,
              goals: self.goals,
              isComplete: goals_completed(merged_boxes, self.goals),
              backups: self.backups,
              activeBackupId: self.activeBackupId,
              nextBackupId: self.nextBackupId,
            }
          } else {
            self
          }
        } else {
          let history = append_snapshot(self.history, self.player, self.boxes)
          let moved_boxes = move_box_chain(self.boxes, chain, direction)
          {
            player: nextPlayer,
            boxes: moved_boxes,
              hoveredBoxId: None,
              gridSize: self.gridSize,
              cellSize: self.cellSize,
              history,
              goals: self.goals,
              isComplete: goals_completed(moved_boxes, self.goals),
              backups: self.backups,
              activeBackupId: self.activeBackupId,
              nextBackupId: self.nextBackupId,
            }
          }
        }
    }
  }
}

///|
fn calculate_next_position(pos : Vector, direction : Direction) -> Vector {
  match direction {
    Up => { x: pos.x, y: pos.y - 1 }
    Down => { x: pos.x, y: pos.y + 1 }
    Left => { x: pos.x - 1, y: pos.y }
    Right => { x: pos.x + 1, y: pos.y }
  }
}

///|
fn is_in_bounds(pos : Vector, gridSize : Int) -> Bool {
  pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize
}

///|
fn find_box_at_position(boxes : Array[Box], pos : Vector) -> Box? {
  let len = boxes.length()
  let mut i = 0
  while i < len {
    let candidate = boxes[i]
    if same_position(candidate.pos, pos) {
      return Some(candidate)
    }
    i += 1
  }
  None
}

///|
fn has_box(boxes : Array[Box], boxId : Int) -> Bool {
  let len = boxes.length()
  let mut i = 0
  while i < len {
    if boxes[i].id == boxId {
      return true
    }
    i += 1
  }
  false
}

///|
fn build_box_views(boxes : Array[Box]) -> Array[BoxView] {
  let len = boxes.length()
  let copy = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    copy.push(to_box_view(boxes[i]))
    i += 1
  }
  copy
}

///|
fn clone_boxes(boxes : Array[Box]) -> Array[Box] {
  let len = boxes.length()
  let copy = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    copy.push(boxes[i])
    i += 1
  }
  copy
}

///|
fn append_snapshot(
  history : Array[Snapshot],
  player : Vector,
  boxes : Array[Box],
) -> Array[Snapshot] {
  let len = history.length()
  let next = Array::new(capacity=len + 1)
  let mut i = 0
  while i < len {
    next.push(history[i])
    i += 1
  }
  next.push({ player, boxes: clone_boxes(boxes) })
  next
}

///|
fn copy_history_prefix(
  history : Array[Snapshot],
  new_len : Int,
) -> Array[Snapshot] {
  if new_len <= 0 {
    Array::new()
  } else {
    let len = history.length()
    let limit = if new_len < len { new_len } else { len }
    let next = Array::new(capacity=limit)
    let mut i = 0
    while i < limit {
      next.push(history[i])
      i += 1
    }
    next
  }
}

///|
fn same_position(lhs : Vector, rhs : Vector) -> Bool {
  lhs.x == rhs.x && lhs.y == rhs.y
}

///|
fn collect_box_chain(
  boxes : Array[Box],
  startPos : Vector,
  direction : Direction,
) -> (Array[Int], Vector, Bool) {
  let chain : Array[Int] = Array::new()
  let (landing, blocked) = loop startPos {
    cursor =>
      match find_box_at_position(boxes, cursor) {
        Some(b) =>
          match b.kind {
            Wall => break (cursor, true)
            Int(_) => {
              chain.push(b.id)
              continue calculate_next_position(cursor, direction)
            }
          }
        None => break (cursor, false)
      }
  }
  (chain, landing, blocked)
}

///|
fn move_box_chain(
  boxes : Array[Box],
  chain : Array[Int],
  direction : Direction,
) -> Array[Box] {
  let len = boxes.length()
  let moved = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    let box = boxes[i]
    if contains_id(chain, box.id) {
      match box.kind {
        Int(value) =>
          moved.push({
            id: box.id,
            pos: calculate_next_position(box.pos, direction),
            kind: Int(value),
          })
        Wall => moved.push(box)
      }
    } else {
      moved.push(box)
    }
    i += 1
  }
  moved
}

///|
fn contains_id(ids : Array[Int], target : Int) -> Bool {
  let len = ids.length()
  let mut i = 0
  while i < len {
    if ids[i] == target {
      break true
    }
    i += 1
  } else {
    false
  }
}

///|
fn find_box_by_id(boxes : Array[Box], id : Int) -> Box? {
  let len = boxes.length()
  let mut i = 0
  while i < len {
    let box = boxes[i]
    if box.id == id {
      return Some(box)
    }
    i += 1
  }
  None
}

///|
fn merge_chain_if_possible(
  boxes : Array[Box],
  chain : Array[Int],
) -> (Array[Box], Bool) {
  let chain_len = chain.length()
  if chain_len < 2 {
    return (boxes, false)
  }
  let first_id = chain[0]
  let second_id = chain[1]
  let first_box = match find_box_by_id(boxes, first_id) {
    Some(box) => box
    None => return (boxes, false)
  }
  let second_box = match find_box_by_id(boxes, second_id) {
    Some(box) => box
    None => return (boxes, false)
  }
  match (first_box.kind, second_box.kind) {
    (Int(v1), Int(v2)) => {
      let len = boxes.length()
      let merged = Array::new(capacity=len - 1)
      let mut idx = 0
      while idx < len {
        let box = boxes[idx]
        if box.id == first_box.id {
          merged.push({
            id: second_box.id,
            pos: second_box.pos,
            kind: Int(v1 + v2),
          })
        } else if box.id == second_box.id {
          // skip second box (already merged)
        } else {
          merged.push(box)
        }
        idx += 1
      }
      (merged, true)
    }
    _ => (boxes, false)
  }
}

///|
fn to_box_view(box : Box) -> BoxView {
  match box.kind {
    Wall => { id: box.id, pos: box.pos, kind: "wall", value: None }
    Int(value) => { id: box.id, pos: box.pos, kind: "int", value: Some(value) }
  }
}

///|
fn clone_vectors(vecs : Array[Vector]) -> Array[Vector] {
  let len = vecs.length()
  let copy = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    copy.push(vecs[i])
    i += 1
  }
  copy
}

///|
fn goals_completed(boxes : Array[Box], goals : Array[Vector]) -> Bool {
  let total = goals.length()
  if total == 0 {
    false
  } else {
    let mut matches = 0
    let mut i = 0
    while i < total {
      let goal = goals[i]
      match find_box_at_position(boxes, goal) {
        Some(box) =>
          match box.kind {
            Int(_) => matches += 1
            Wall => ()
          }
        None => ()
      }
      i += 1
    }
    matches == total
  }
}

