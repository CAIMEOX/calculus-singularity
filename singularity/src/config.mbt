///|
fn seed_boxes() -> Array[Box] {
  let boxes : Array[Box] = Array::new(capacity=6)
  boxes.push({ id: 1, pos: { x: 2, y: 2 }, kind: Int(3) })
  boxes.push({ id: 2, pos: { x: 3, y: 2 }, kind: Int(7) })
  boxes.push({ id: 3, pos: { x: 3, y: 3 }, kind: Int(1) })
  boxes.push({ id: 4, pos: { x: 5, y: 5 }, kind: Wall })
  boxes.push({ id: 5, pos: { x: 6, y: 5 }, kind: Wall })
  boxes.push({ id: 6, pos: { x: 7, y: 5 }, kind: Wall })
  boxes
}

///|
fn seed_goals() -> Array[Vector] {
  let goals : Array[Vector] = Array::new(capacity=3)
  goals.push({ x: 8, y: 2 })
  goals.push({ x: 8, y: 3 })
  goals.push({ x: 8, y: 4 })
  goals
}

///|
fn default_grid_size() -> Int {
  10
}

///|
fn default_cell_size() -> Int {
  50
}
