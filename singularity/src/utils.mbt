///|
fn box_by_id(boxes : Array[Box], id : Int) -> Box? {
  boxes.search_by(x => x.id == id).map(x => boxes[x])
}
