///|
/// Core 2D vector used for grid coordinates
pub struct Vector {
  x : Int
  y : Int
} derive(@json.FromJson, ToJson, Eq)

///|
/// Box entity that can be pushed around by the player
pub struct Box {
  id : Int
  pos : Vector
  kind : Kind
} derive(@json.FromJson, ToJson)

///|
/// Supported box kinds
pub enum Kind {
  Wall
  Prop(String)
  Implication(Kind, Kind)
  And(Kind, Kind)
  Neg(Kind?)
  Fst(Kind?)
  Snd(Kind?)
} derive(Eq, @json.FromJson, ToJson)

///|
/// Internal application state handled entirely inside Moonbit
pub struct Model {
  player : Vector
  boxes : Array[Box]
  hoveredBoxId : Int?
  gridWidth : Int
  gridHeight : Int
  cellSize : Int
  goals : Array[Goal]
  history : Array[Snapshot]
  isComplete : Bool
  backups : Array[BackupNode]
  activeBackupId : Int?
  nextBackupId : Int
  levelId : Int
  levelName : String
}

///|
/// Snapshot used for undo
pub struct Snapshot {
  player : Vector
  boxes : Array[Box]
}

///|
/// Render-ready snapshot returned to the TypeScript renderer
pub struct ViewModel {
  player : Vector
  boxes : Array[Box]
  hoveredBoxId : Int?
  gridWidth : Int
  gridHeight : Int
  cellSize : Int
  goals : Array[GoalView]
  isComplete : Bool
  levelId : Int
  levelName : String
}

///|
pub struct Goal {
  pos : Vector
  prop : Kind
} derive(@json.FromJson, ToJson)

///|
pub struct GoalView {
  pos : Vector
  prop : Kind
  satisfied : Bool
}

///|
pub struct InfoPanelLine {
  text : String
  tone : String
  kind : Kind?
}

///|
pub struct InfoPanelStat {
  label : String
  value : String
}

///|
pub struct InfoPanelData {
  title : String
  stats : Array[InfoPanelStat]
  boxes : Array[InfoPanelLine]
  goals : Array[InfoPanelLine]
}

///|
pub struct BackupState {
  player : Vector
  boxes : Array[Box]
  hoveredBoxId : Int?
  history : Array[Snapshot]
}

///|
pub struct BackupNode {
  id : Int
  parentId : Int?
  childIds : Array[Int]
  timestamp : Int
  state : BackupState
}

///|
pub struct BackupMeta {
  id : Int
  parentId : Int?
  childIds : Array[Int]
  timestamp : Int
}

///|
/// Supported move directions for the Elm style update loop
enum Direction {
  Up
  Down
  Left
  Right
}
