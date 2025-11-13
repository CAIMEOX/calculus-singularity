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
const INFO_TONE_NORMAL : String = "normal"
const INFO_TONE_HOVERED : String = "hovered"
const INFO_TONE_PROVED : String = "proved"
const INFO_TONE_UNEXPECTED : String = "unexpected"

///|
pub fn kind_to_label(kind : Kind) -> String {
  match kind {
    Prop(label) => label
    Implication(_, _) => "→"
    And(_, _) => "∧"
    Fst(_) => "π₁"
    Snd(_) => "π₂"
    Neg(_) => "¬"
    Wall => "Wall"
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
fn render_goal(boxes : Array[Box], goal : GoalView) -> InfoPanelLine {
  let baseline = "⊢ \{goal.prop} @ (\{goal.pos.x}, \{goal.pos.y})"
  if goal.satisfied {
    {
      text: baseline,
      tone: INFO_TONE_PROVED,
    }
  } else {
    for b in boxes {
      if b.pos == goal.pos && b.kind != goal.prop {
        break {
          text: "⊢ expected \{goal.prop} but got \{b.kind} @ (\{goal.pos.x}, \{goal.pos.y})",
          tone: INFO_TONE_UNEXPECTED,
        }
      }
    } else {
      {
        text: baseline,
        tone: INFO_TONE_NORMAL,
      }
    }
  }
}

///|
pub fn generate_panel_content(modelView : ViewModel) -> InfoPanelData {
  let stats : Array[InfoPanelStat] = Array::new()
  stats.push({
    label: "Level",
    value: "Level \{modelView.levelId}: \{modelView.levelName}",
  })
  stats.push({
    label: "Grid",
    value: "\{modelView.gridWidth} x \{modelView.gridHeight}",
  })
  stats.push({
    label: "Status",
    value: if modelView.isComplete {
      "Level Complete!"
    } else {
      "In Progress"
    },
  })
  stats.push({
    label: "Hint",
    value: get_description(modelView.levelId),
  })

  let boxes : Array[InfoPanelLine] = Array::new()
  for box in modelView.boxes {
    guard box.kind != Wall else { continue }
    let tone = if modelView.hoveredBoxId is Some(id) && box.id == id {
      INFO_TONE_HOVERED
    } else {
      INFO_TONE_NORMAL
    }
    boxes.push({ text: box.to_string(), tone })
  }

  let goals : Array[InfoPanelLine] = Array::new()
  for goal in modelView.goals {
    goals.push(render_goal(modelView.boxes, goal))
  }

  {
    title: "INFO",
    stats,
    boxes,
    goals,
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
