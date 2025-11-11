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
  { id, pos: { x, y }, kind: Fst(None) }
}

///|
pub fn make_pi2_box(id : Int, x : Int, y : Int) -> Box {
  { id, pos: { x, y }, kind: Snd(None) }
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
pub suberror KindParseError {
  UnexpectedToken(String)
  UnexpectedEnd
}

///|
priv enum LogicToken {
  Identifier(String)
  Arrow
  Amp
  Not
  LParen
  RParen
  FstTok
  SndTok
  End
}

///|
pub fn compose_kind(raw : String) -> Kind raise KindParseError {
  let tokens = lex_tokens(raw)
  let (kind, pos) = parse_implication(tokens, 0)
  match token_at(tokens, pos) {
    End => kind
    token => raise UnexpectedToken(token_description(token))
  }
}

///|
fn lex_tokens(input : String) -> Array[LogicToken] raise KindParseError {
  let len = input.length()
  let tokens : Array[LogicToken] = Array::new()
  let mut idx = 0
  while idx < len {
    let ch = input.unsafe_charcode_at(idx).unsafe_to_char()
    if is_whitespace_char(ch) {
      idx += 1
      continue
    }
    match ch {
      '(' => {
        tokens.push(LParen)
        idx += 1
      }
      ')' => {
        tokens.push(RParen)
        idx += 1
      }
      '&' => {
        tokens.push(Amp)
        idx += 1
      }
      '!' => {
        tokens.push(Not)
        idx += 1
      }
      '-' =>
        if idx + 1 < len && input.unsafe_charcode_at(idx + 1) == '>'.to_int() {
          tokens.push(Arrow)
          idx += 2
        } else {
          raise UnexpectedToken("-")
        }
      _ =>
        if is_ident_char(ch) {
          let (ident, next) = read_identifier(input, idx)
          let lower = ident.to_lower()
          match lower {
            "fst" => tokens.push(FstTok)
            "snd" => tokens.push(SndTok)
            _ => tokens.push(Identifier(ident))
          }
          idx = next
        } else {
          raise UnexpectedToken(String::make(1, ch))
        }
    }
  }
  tokens.push(End)
  tokens
}

///|
fn parse_implication(
  tokens : Array[LogicToken],
  start : Int,
) -> (Kind, Int) raise KindParseError {
  let (left, pos) = parse_and(tokens, start)
  match token_at(tokens, pos) {
    Arrow => {
      let (right, next) = parse_implication(tokens, pos + 1)
      (Implication(left, right), next)
    }
    _ => (left, pos)
  }
}

///|
fn parse_and(
  tokens : Array[LogicToken],
  start : Int,
) -> (Kind, Int) raise KindParseError {
  let (first, first_pos) = parse_unary(tokens, start)
  let mut current = first
  let mut pos = first_pos
  while true {
    match token_at(tokens, pos) {
      Amp => {
        let (rhs, next) = parse_unary(tokens, pos + 1)
        current = And(current, rhs)
        pos = next
      }
      _ => break
    }
  }
  (current, pos)
}

///|
fn parse_unary(
  tokens : Array[LogicToken],
  start : Int,
) -> (Kind, Int) raise KindParseError {
  match token_at(tokens, start) {
    Not => {
      let (expr, next) = parse_unary(tokens, start + 1)
      (Neg(Some(expr)), next)
    }
    FstTok => {
      let (expr, next) = parse_unary(tokens, start + 1)
      (Fst(Some(expr)), next)
    }
    SndTok => {
      let (expr, next) = parse_unary(tokens, start + 1)
      (Snd(Some(expr)), next)
    }
    _ => parse_primary(tokens, start)
  }
}

///|
fn parse_primary(
  tokens : Array[LogicToken],
  start : Int,
) -> (Kind, Int) raise KindParseError {
  match token_at(tokens, start) {
    Identifier(name) => (Prop(name), start + 1)
    LParen => {
      let (expr, mid) = parse_implication(tokens, start + 1)
      match token_at(tokens, mid) {
        RParen => (expr, mid + 1)
        token => raise UnexpectedToken(token_description(token))
      }
    }
    End => raise UnexpectedEnd
    token => raise UnexpectedToken(token_description(token))
  }
}

///|
fn read_identifier(input : String, start : Int) -> (String, Int) {
  let len = input.length()
  let builder = StringBuilder::new(size_hint=8)
  let mut idx = start
  while idx < len {
    let ch = input.unsafe_charcode_at(idx).unsafe_to_char()
    if is_ident_char(ch) {
      builder.write_char(ch)
      idx += 1
    } else {
      break
    }
  }
  (builder.to_string(), idx)
}

///|
fn token_at(tokens : Array[LogicToken], pos : Int) -> LogicToken {
  if pos < tokens.length() {
    tokens[pos]
  } else {
    End
  }
}

///|
fn token_description(token : LogicToken) -> String {
  match token {
    Identifier(name) => "identifier '\{name}'"
    Arrow => "'->'"
    Amp => "'&'"
    Not => "'!'"
    LParen => "'('"
    RParen => "')'"
    FstTok => "'fst'"
    SndTok => "'snd'"
    End => "end of input"
  }
}

///|
fn is_ident_char(ch : Char) -> Bool {
  let code = ch.to_int()
  (code >= 'a'.to_int() && code <= 'z'.to_int()) ||
  (code >= 'A'.to_int() && code <= 'Z'.to_int()) ||
  (code >= '0'.to_int() && code <= '9'.to_int()) ||
  ch == '_'
}

///|
fn is_whitespace_char(ch : Char) -> Bool {
  ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r'
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

///|
test "parsing logical expressions" {
  let k1 = compose_kind("A -> B & C")
  @json.inspect(k1, content=[
    "Implication",
    ["Prop", "A"],
    ["And", ["Prop", "B"], ["Prop", "C"]],
  ])
  let k2 = compose_kind("!A -> fst (B & C)")
  @json.inspect(k2, content=[
    "Implication",
    ["Neg", [["Prop", "A"]]],
    ["Fst", [["And", ["Prop", "B"], ["Prop", "C"]]]],
  ])
  let k3 = compose_kind("A & B & C & D")
  @json.inspect(k3, content=[
    "And",
    ["And", ["And", ["Prop", "A"], ["Prop", "B"]], ["Prop", "C"]],
    ["Prop", "D"],
  ])
  let k4 = compose_kind("snd (A & B) -> !C")
  @json.inspect(k4, content=[
    "Implication",
    ["Snd", [["And", ["Prop", "A"], ["Prop", "B"]]]],
    ["Neg", [["Prop", "C"]]],
  ])
}
