///|
/// Core 2D vector used for grid coordinates
pub struct Vector {
  x : Int
  y : Int
}

///|
/// Box entity that can be pushed around by the player
pub struct Box {
  id : Int
  pos : Vector
  kind : BoxType
}

///|
/// Supported box kinds
pub enum BoxType {
  Wall
  Prop(String)
  Implication(BoxType, BoxType)
  And(BoxType, BoxType)
  Neg(BoxType?)
  Fst
  Snd
} derive(Eq)


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
  boxes : Array[BoxView]
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
/// Shape sent to the renderer for each box
pub struct BoxView {
  id : Int
  pos : Vector
  kind : String
  label : String?
  secondary : String?
}

///|
pub struct Goal {
  pos : Vector
  prop : BoxType
}

///|
pub struct GoalView {
  pos : Vector
  prop : String
  satisfied : Bool
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
