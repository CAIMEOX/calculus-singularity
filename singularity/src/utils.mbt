///|
fn box_by_id(boxes : Array[Box], id : Int) -> Box? {
  boxes.search_by(x => x.id == id).map(x => boxes[x])
}

///|
fn Box::on_goal(self : Box, goals : Array[GoalView]) -> Bool {
  goals.iter().any(g => same_position(self.pos, g.pos))
}

///|
pub impl Show for Kind with to_string(self) {
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
    Fst(Some(expr)) => "π₁(\{expr})"
    Fst(None) => "π₁"
    Snd(Some(expr)) => "π₂(\{expr})"
    Snd(None) => "π₂"
    Neg(Some(Neg(Some(x)))) => x.to_string()
    Neg(Some(Prop(label))) => "¬\{label}"
    Neg(None) => "¬"
    Neg(Some(inner)) => "¬(\{inner})"
  }
}

///|
pub impl Show for Kind with output(self, f) {
  f.write_string(self.to_string())
}

///|
pub impl Show for Box with output(self, f) {
  f.write_string(
    "Box \{self.id}: \{self.kind} @ (\{self.pos.x}, \{self.pos.y})",
  )
}

///|
const STYLE_HOVERED : String = "font-weight: bold; color: #00FFFF;"

///|
pub fn kind_to_label(kind : Kind) -> String {
  match kind {
    Prop(label) => label
    Implication(_, _) => "→".to_string()
    And(_, _) => "∧".to_string()
    Fst(_) => "π₁".to_string()
    Snd(_) => "π₂".to_string()
    Neg(_) => "¬".to_string()
    Wall => "Wall".to_string()
  }
}

///|
pub fn kind_to_string(kind : Kind) -> String {
  match kind {
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
      "\{norm_p} -> \{norm_c}"
    }
    And(left, right) => "(\{left} & \{right})"
    Fst(Some(expr)) => "fst (\{expr})"
    Fst(None) => "fst"
    Snd(Some(expr)) => "snd (\{expr})"
    Snd(None) => "snd"
    Neg(Some(Neg(Some(x)))) => x.to_string()
    Neg(Some(Prop(label))) => "!\{label}"
    Neg(None) => "!"
    Neg(Some(inner)) => "!(\{inner})"
  }
}

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
    guard box.kind != Wall else { continue }
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

///|
pub(all) struct Style {
  size : Int
  borderWidth : Float
  symbolFont : String
  fillColor : Int
  borderColor : Int
  symbol : String
}

///|
pub fn style_for_kind(kind : Kind, cellSize : Int) -> Style {
  let symbolFont = "bold \{@cmp.maximum(16.0, cellSize.to_double() * 0.5)}px \"Courier New\", Courier, monospace"
  let borderWidth : Float = 1.5
  match kind {
    Wall =>
      {
        size: cellSize,
        borderWidth: 1.5,
        symbolFont,
        fillColor: WALL_FILL,
        borderColor: WALL_BORDER,
        symbol: "",
      }
    Prop(label) =>
      {
        size: cellSize,
        borderWidth,
        symbolFont,
        fillColor: PROP_FILL,
        borderColor: PROP_BORDER,
        symbol: label,
      }
    Implication(_, _) =>
      {
        size: cellSize,
        borderWidth,
        symbolFont,
        fillColor: IMPLICATION_FILL,
        borderColor: PROP_BORDER,
        symbol: "→",
      }
    And(_, _) =>
      {
        size: cellSize,
        borderWidth,
        symbolFont,
        fillColor: AND_FILL,
        borderColor: AND_BORDER,
        symbol: "∧",
      }
    Fst(_) =>
      {
        size: cellSize,
        borderWidth,
        symbolFont,
        fillColor: PI_FILL,
        borderColor: 0x74c0ff,
        symbol: "π₁",
      }
    Snd(_) =>
      {
        size: cellSize,
        borderWidth,
        symbolFont,
        fillColor: PI_FILL,
        borderColor: 0xff9fdc,
        symbol: "π₂",
      }
    Neg(_) =>
      {
        size: cellSize,
        borderWidth,
        symbolFont,
        fillColor: 0xFFD0D0,
        borderColor: 0xC00000,
        symbol: "¬",
      }
  }
}
