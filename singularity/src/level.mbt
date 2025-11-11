///|
pub struct LevelInfo {
  id : Int
  name : String
  gridWidth : Int
  gridHeight : Int
  cellSize : Int
} derive(@json.FromJson, ToJson)

///|
pub struct Level {
  info : LevelInfo
  player : Vector
  boxes : Array[Box]
  goals : Array[Goal]
} derive(@json.FromJson, ToJson)

// Level Builders DSL

///|
pub fn make_wall(id : Int, x : Int, y : Int) -> Box {
  { id, pos: { x, y }, kind: Wall }
}

///|
pub fn make_prop_box(id : Int, x : Int, y : Int, label : String) -> Box {
  { id, pos: { x, y }, kind: Prop(label) }
}

///|
pub fn make_implication_box(
  id : Int,
  x : Int,
  y : Int,
  premise : String,
  conclusion : String,
) -> Box {
  { id, pos: { x, y }, kind: Implication(Prop(premise), Prop(conclusion)) }
}

///|
pub fn make_and_box(
  id : Int,
  x : Int,
  y : Int,
  left : String,
  right : String,
) -> Box {
  { id, pos: { x, y }, kind: And(Prop(left), Prop(right)) }
}

///|
pub fn make_pi1_box(id : Int, x : Int, y : Int) -> Box {
  { id, pos: { x, y }, kind: Fst }
}

///|
pub fn make_pi2_box(id : Int, x : Int, y : Int) -> Box {
  { id, pos: { x, y }, kind: Snd }
}

///|
pub fn make_goal(x : Int, y : Int, prop : String) -> Goal {
  { pos: { x, y }, prop: Prop(prop) }
}

///|
pub fn make_negation_box(id : Int, x : Int, y : Int) -> Box {
  { id, pos: { x, y }, kind: Neg(None) }
}

///|
pub fn make_negation_box_with_inner(
  id : Int,
  x : Int,
  y : Int,
  inner : String,
) -> Box {
  { id, pos: { x, y }, kind: Neg(Some(Prop(inner))) }
}

///|
pub suberror LoadLevel {
  InvalidJson(@json.ParseError)
  InvalidDataFormat(@json.JsonDecodeError)
}

///|
pub fn load_from_json(json : String) -> Level raise LoadLevel {
  let j = @json.parse(json) catch { e => raise InvalidJson(e) }
  @json.from_json(j) catch {
    e => raise InvalidDataFormat(e)
  }
}

///|
pub fn save_to_json(level : Level) -> String {
  level.to_json().stringify()
}
