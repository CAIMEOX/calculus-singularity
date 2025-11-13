///|
fn box_by_id(boxes : Array[Box], id : Int) -> Box? {
  boxes.search_by(x => x.id == id).map(x => boxes[x])
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
  f.write_string("\{self.kind} @ (\{self.pos.x}, \{self.pos.y})")
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
fn paren(s : String, cond : Bool) -> String {
  if cond {
    "(\{s})"
  } else {
    s
  }
}

///|
pub fn kind_to_string(kind : Kind) -> String {
  letrec go = k => match k {
    Wall => "Wall"
    Prop(label) => "\{(label)}"
    Implication(premise, conclusion) => {
      let premise_s = go(premise)
      let conclusion_s = go(conclusion)
      let norm_p = paren(premise_s, premise is Implication(_, _))
      let norm_c = paren(conclusion_s, conclusion is Implication(_, _))
      "\{norm_p} -> \{norm_c}"
    }
    And(left, right) => {
      let left_s = go(left)
      let right_s = go(right)
      "(\{left_s} & \{right_s})"
    }
    Fst(Some(expr)) => "fst (\{go(expr)})"
    Fst(None) => "fst"
    Snd(Some(expr)) => "snd (\{go(expr)})"
    Snd(None) => "snd"
    Neg(Some(Neg(Some(x)))) => go(x)
    Neg(Some(Prop(label))) => "!\{label}"
    Neg(None) => "!"
    Neg(Some(inner)) => "!(\{go(inner)})"
  }

  go(kind)
}

///|
fn compose_hovered(s : String) -> String {
  "<span style=\"\{STYLE_HOVERED}\">\{s}</span>"
}

///|
fn compose_proved(s : String) -> String {
  "<span style=\"font-weight: bold; color: #00FF00;\">\{s}</span>"
}

///|
fn compose_unexpected(s : String) -> String {
  "<span style=\"font-weight: bold; color: #FF0000;\">\{s}</span>"
}

///|
fn render_goal(boxes : Array[Box], goal : GoalView) -> String {
  if goal.satisfied {
    compose_proved("⊢ \{goal.prop} @ (\{goal.pos.x}, \{goal.pos.y})")
  } else {
    for b in boxes {
      if b.pos == goal.pos && b.kind != goal.prop {
        break compose_unexpected(
          "⊢ expected \{goal.prop} but got \{b.kind} @ (\{goal.pos.x}, \{goal.pos.y})",
        )
      }
    } else {
      "⊢ \{goal.prop} @ (\{goal.pos.x}, \{goal.pos.y})"
    }
  }
}

///|
pub fn generate_panel_content(modelView : ViewModel) -> String {
  let mut content = "<h3>INFO</h3><hr>"
  content += "Level \{modelView.levelId}: \{modelView.levelName}<br>"
  content += "Grid: \{modelView.gridWidth} x \{modelView.gridHeight}<br>"
  let is_complete = if modelView.isComplete {
    "Level Complete!"
  } else {
    "In Progress"
  }
  content += "Status: \{is_complete}<br>"
  content += "Hint: \{get_description(modelView.levelId)}<br>"
  content += "Goals:<br>"
  for box in modelView.boxes {
    guard box.kind != Wall else { continue }
    let temp = box.to_string() + "<br>"
    content += if modelView.hoveredBoxId is Some(id) && box.id == id {
      compose_hovered(temp)
    } else {
      temp
    }
  }
  for goal in modelView.goals {
    content += render_goal(modelView.boxes, goal) + "<br>"
  }
  content
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
fn is_in_bounds(pos : Vector, width : Int, height : Int) -> Bool {
  pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height
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
