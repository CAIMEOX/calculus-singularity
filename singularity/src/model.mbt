///| Core 2D vector used for grid coordinates
pub struct Vector {
  x : Int
  y : Int
}

///| Box entity that can be pushed around by the player
pub struct Box {
  id : Int
  pos : Vector
  symbol : String
}

///| Internal application state handled entirely inside Moonbit
pub struct Model {
  player : Vector
  boxes : Array[Box]
  hoveredBoxId : Int?
  gridSize : Int
  cellSize : Int
  history : Array[Snapshot]
}

///| Snapshot used for undo
pub struct Snapshot {
  player : Vector
  boxes : Array[Box]
}

///| Render-ready snapshot returned to the TypeScript renderer
pub struct ViewModel {
  player : Vector
  boxes : Array[Box]
  hoveredBoxId : Int?
  gridSize : Int
  cellSize : Int
}

///| Supported move directions for the Elm style update loop
enum Direction {
  Up
  Down
  Left
  Right
}

///| Map DOM keyboard input to logical directions
fn Direction::from_key(key : String) -> Direction? {
  match key {
    "ArrowUp" | "w" => Some(Up)
    "ArrowDown" | "s" => Some(Down)
    "ArrowLeft" | "a" => Some(Left)
    "ArrowRight" | "d" => Some(Right)
    _ => None
  }
}

///| Initialize the core model
pub fn init_model() -> Model {
  {
    player: { x: 1, y: 1 },
    boxes: seed_boxes(),
    hoveredBoxId: None,
    gridSize: default_grid_size(),
    cellSize: default_cell_size(),
    history: Array::new(),
  }
}

///| Entry point for keyboard events coming from the Pixi layer
pub fn move_with_key(model : Model, key : String) -> Model {
  match Direction::from_key(key) {
    Some(direction) => model.step(direction)
    None => model
  }
}

///| Hover handler used by Box mouse events
pub fn hover_box(model : Model, boxId : Int) -> Model {
  if has_box(model.boxes, boxId) {
    {
      player: model.player,
      boxes: model.boxes,
      hoveredBoxId: Some(boxId),
      gridSize: model.gridSize,
      cellSize: model.cellSize,
      history: model.history,
    }
  } else {
    model
  }
}

///| Reset hover state when the mouse leaves a box
pub fn clear_hover(model : Model) -> Model {
  {
    player: model.player,
    boxes: model.boxes,
    hoveredBoxId: None,
    gridSize: model.gridSize,
    cellSize: model.cellSize,
    history: model.history,
  }
}

///| Pure View function that exposes data for rendering
pub fn view(model : Model) -> ViewModel {
  {
    player: model.player,
    boxes: snapshot_boxes(model.boxes),
    hoveredBoxId: model.hoveredBoxId,
    gridSize: model.gridSize,
    cellSize: model.cellSize,
  }
}

///| Undo the last move if history is available
pub fn undo(model : Model) -> Model {
  let len = model.history.length()
  if len == 0 {
    model
  } else {
    let snapshot = model.history[len - 1]
    let trimmed = copy_history_prefix(model.history, len - 1)
    {
      player: snapshot.player,
      boxes: clone_boxes(snapshot.boxes),
      hoveredBoxId: None,
      gridSize: model.gridSize,
      cellSize: model.cellSize,
      history: trimmed,
    }
  }
}

///| Core Elm update logic, implemented in Moonbit
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
        }
      }
      Some(box) => {
        let nextBoxPos = calculate_next_position(box.pos, direction)
        if !is_in_bounds(nextBoxPos, self.gridSize) ||
           is_position_occupied_by_other_box(self.boxes, nextBoxPos, box.id) {
          self
        } else {
          let history = append_snapshot(self.history, self.player, self.boxes)
          {
            player: nextPlayer,
            boxes: update_box_position(self.boxes, box.id, nextBoxPos),
            hoveredBoxId: None,
            gridSize: self.gridSize,
            cellSize: self.cellSize,
            history,
          }
        }
      }
    }
  }
}

fn calculate_next_position(pos : Vector, direction : Direction) -> Vector {
  match direction {
    Up => { x: pos.x, y: pos.y - 1 }
    Down => { x: pos.x, y: pos.y + 1 }
    Left => { x: pos.x - 1, y: pos.y }
    Right => { x: pos.x + 1, y: pos.y }
  }
}

fn is_in_bounds(pos : Vector, gridSize : Int) -> Bool {
  pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize
}

fn is_position_occupied_by_other_box(boxes : Array[Box], pos : Vector, excludeId : Int) -> Bool {
  let len = boxes.length()
  let mut i = 0
  while i < len {
    let candidate = boxes[i]
    if candidate.id != excludeId && same_position(candidate.pos, pos) {
      return true
    }
    i += 1
  }
  false
}

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

fn update_box_position(boxes : Array[Box], boxId : Int, newPos : Vector) -> Array[Box] {
  let len = boxes.length()
  let updated = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    let candidate = boxes[i]
    if candidate.id == boxId {
      updated.push({ id: candidate.id, pos: newPos, symbol: candidate.symbol })
    } else {
      updated.push(candidate)
    }
    i += 1
  }
  updated
}

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

fn snapshot_boxes(boxes : Array[Box]) -> Array[Box] {
  let len = boxes.length()
  let copy = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    copy.push(boxes[i])
    i += 1
  }
  copy
}

fn clone_boxes(boxes : Array[Box]) -> Array[Box] {
  snapshot_boxes(boxes)
}

fn append_snapshot(history : Array[Snapshot], player : Vector, boxes : Array[Box]) -> Array[Snapshot] {
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

fn copy_history_prefix(history : Array[Snapshot], new_len : Int) -> Array[Snapshot] {
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

fn same_position(lhs : Vector, rhs : Vector) -> Bool {
  lhs.x == rhs.x && lhs.y == rhs.y
}

fn seed_boxes() -> Array[Box] {
  let boxes : Array[Box] = Array::new(capacity=1)
  boxes.push({ id: 1, pos: { x: 3, y: 3 }, symbol: "5" })
  boxes
}

fn default_grid_size() -> Int {
  10
}

fn default_cell_size() -> Int {
  50
}
