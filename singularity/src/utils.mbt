///|
fn box_by_id(boxes : Array[Box], id : Int) -> Box? {
  boxes.search_by(x => x.id == id).map(x => boxes[x])
}

///|
fn BoxView::on_goal(self : BoxView, goals : Array[Vector]) -> Bool {
  goals.iter().any(g => same_position(self.pos, g))
}

///|
pub impl Show for BoxType

///|
pub impl Show for BoxType with output(self, f) {
  match self {
    Wall => f.write_string("Wall")
    Int(value) => f.write_string("Int(\{value})")
  }
}

///|
pub impl Show for BoxView

///|
pub impl Show for BoxView with output(self, logger) {
  logger.write_string(
    "Position: (\{self.pos.x}, \{self.pos.y})<br>Type: \{self.kind}",
  )
}

///|
const STYLE_HOVERED : String = "font-weight: bold; color: #00FFFF;"

///|
fn compose_hovered(s : String) -> String {
  "<span style=\"\{STYLE_HOVERED}\">\{s}</span>"
}

///|
pub fn generate_panel_content(modelView : ViewModel) -> String {
  let mut content = "<h3>INFO</h3><hr>"
  content += "<p>Level \{modelView.levelId}: \{modelView.levelName}</p>"
  content += "<p>Grid: \{modelView.gridWidth} x \{modelView.gridHeight}</p>"
  let is_complete = if modelView.isComplete {
    "Level Complete!"
  } else {
    "In Progress"
  }
  content += "<p>Status: \{is_complete}</p>"
  content += "<p>Keys: 1-9 切换关卡 · Z 撤销 · B 备份 · R 重置</p>"
  for box in modelView.boxes {
    guard box.kind != "wall" else { continue }
    let on_goal = if box.on_goal(modelView.goals) { "Yes" } else { "No" }
    let temp = box.to_string() + "<br>On Goal: \{on_goal}</br>"
    content += if modelView.hoveredBoxId is Some(id) && box.id == id {
      compose_hovered(temp)
    } else {
      temp
    }
  }
  content
}
