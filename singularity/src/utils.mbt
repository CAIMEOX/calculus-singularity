///|
fn box_by_id(boxes : Array[Box], id : Int) -> Box? {
  boxes.search_by(x => x.id == id).map(x => boxes[x])
}

///|
fn BoxView::on_goal(self : BoxView, goals : Array[GoalView]) -> Bool {
  goals.iter().any(g => same_position(self.pos, g.pos))
}

///|
pub impl Show for BoxType with to_string(self) {
  match self {
    Wall => "Wall"
    Prop(label) => "\{label}"
    Implication(premise, conclusion) => {
      let norm_p = if premise is Implication(_, _) {
        "(\{premise})"
      } else {
        "\{premise}"
      }
      let norm_c = if conclusion is Implication(_, _) {
        "(\{conclusion})"
      } else {
        "\{conclusion}"
      }
      "\{norm_p} → \{norm_c}"
    }
    And(left, right) => "(\{left} ∧ \{right})"
    Fst => "π₁ (fst)"
    Snd => "π₂ (snd)"
    Neg(Some(Neg(Some(x)))) => x.to_string()
    Neg(Some(Prop(label))) => "¬\{label}"
    Neg(None) => "¬"
    Neg(Some(inner)) => "¬(\{inner})"
  }
}

///|
pub impl Show for BoxType with output(self, f) {
  f.write_string(self.to_string())
}

///|
pub impl Show for BoxView

///|
pub impl Show for BoxView with output(self, logger) {
  let pos = self.pos
  let descriptor = describe_box(self.kind, self.label, self.secondary)
  logger.write_string("位置: (\{pos.x}, \{pos.y})<br>\{descriptor}")
}

///|
fn describe_box(kind : String, label : String?, secondary : String?) -> String {
  if kind == "prop" {
    match label {
      Some(value) => "Prop: \{value}"
      None => "命题"
    }
  } else if kind == "implication" {
    match (label, secondary) {
      (Some(premise), Some(conclusion)) =>
        "Implication \{premise} → \{conclusion}"
      _ => "蕴涵"
    }
  } else if kind == "and" {
    match (label, secondary) {
      (Some(left), Some(right)) => "合取：(\{left} ∧ \{right})"
      _ => "合取"
    }
  } else if kind == "pi1" {
    "π₁ Eliminator"
  } else if kind == "pi2" {
    "π₂ Eliminator"
  } else {
    kind
  }
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
  content += "<p>逻辑法则：命题+命题→合取 · A→B 与 A 合并生成 B · π₁/π₂ 提取合取左右命题</p>"
  content += "<p>Goals:</p>"
  for goal in modelView.goals {
    let status = if goal.satisfied { "✅" } else { "…" }
    content += "\{status} \{goal.prop} @ (\{goal.pos.x}, \{goal.pos.y})<br>"
  }
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
