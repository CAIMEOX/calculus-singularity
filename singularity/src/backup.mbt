///|
/// Undo the last move if history is available
pub fn undo(model : Model) -> Model {
  let len = model.history.length()
  if len == 0 {
    model
  } else {
    let snapshot = model.history[len - 1]
    let trimmed = model.history[:len - 1].to_array()
    let moveLog = trim_move_log(model.moveLog)
    let boxes = snapshot.boxes.copy()
    {
      player: snapshot.player,
      boxes,
      hoveredBoxId: None,
      gridWidth: model.gridWidth,
      gridHeight: model.gridHeight,
      cellSize: model.cellSize,
      history: trimmed,
      moveLog,
      goals: model.goals,
      isComplete: goals_completed(boxes, model.goals),
      backups: model.backups,
      activeBackupId: model.activeBackupId,
      nextBackupId: model.nextBackupId,
      levelId: model.levelId,
      levelName: model.levelName,
      initialPlayer: model.initialPlayer,
      initialBoxes: model.initialBoxes,
    }
  }
}

///|
pub fn Model::save_backup(self : Model, timestamp : Int) -> Model {
  let newId = self.nextBackupId + 1
  let newNode = {
    id: newId,
    parentId: self.activeBackupId,
    childIds: Array::new(),
    timestamp,
    state: capture_backup_state(self),
  }
  let updatedBackups = append_backup_node(
    self.backups,
    newNode,
    self.activeBackupId,
  )
  {
    player: self.player,
    boxes: self.boxes,
    hoveredBoxId: self.hoveredBoxId,
    gridWidth: self.gridWidth,
    gridHeight: self.gridHeight,
    cellSize: self.cellSize,
    goals: self.goals,
  history: self.history,
  moveLog: self.moveLog,
  initialPlayer: self.initialPlayer,
  initialBoxes: self.initialBoxes,
  isComplete: self.isComplete,
  backups: updatedBackups,
  activeBackupId: Some(newId),
  nextBackupId: newId,
  levelId: self.levelId,
    levelName: self.levelName,
  }
}

///|
pub fn Model::list_backups(self : Model) -> Array[BackupMeta] {
  self.backups.map(backup_meta)
}

///|
pub fn Model::get_active_backup_meta(self : Model) -> BackupMeta? {
  match self.activeBackupId {
    Some(id) => find_backup_node(self.backups, id).map(backup_meta)
    None => None
  }
}

///|
pub fn Model::restore_backup(self : Model, backupId : Int) -> Model {
  match find_backup_node(self.backups, backupId) {
    Some(node) => apply_backup_state(self, node.state, backupId)
    None => self
  }
}

///|
fn capture_backup_state(model : Model) -> BackupState {
  {
    player: model.player,
    boxes: model.boxes.copy(),
    hoveredBoxId: model.hoveredBoxId,
    history: model.history.copy(),
    moveLog: model.moveLog.copy(),
    initialPlayer: model.initialPlayer,
    initialBoxes: model.initialBoxes.copy(),
  }
}

///|
fn apply_backup_state(
  model : Model,
  state : BackupState,
  activeId : Int,
) -> Model {
  let boxes = state.boxes.copy()
  let history = state.history.copy()
  let moveLog = state.moveLog.copy()
  {
    player: state.player,
    boxes,
    hoveredBoxId: state.hoveredBoxId,
    gridWidth: model.gridWidth,
    gridHeight: model.gridHeight,
    cellSize: model.cellSize,
    goals: model.goals,
    history,
    moveLog,
    initialPlayer: model.initialPlayer,
    initialBoxes: model.initialBoxes,
    isComplete: goals_completed(boxes, model.goals),
    backups: model.backups,
    activeBackupId: Some(activeId),
    nextBackupId: model.nextBackupId,
    levelId: model.levelId,
    levelName: model.levelName,
  }
}

///|
fn append_backup_node(
  backups : Array[BackupNode],
  node : BackupNode,
  parentId : Int?,
) -> Array[BackupNode] {
  let len = backups.length()
  let result = Array::new(capacity=len + 1)
  let mut i = 0
  while i < len {
    let existing = backups[i]
    let updated = match parentId {
      Some(pid) if existing.id == pid => add_child(existing, node.id)
      _ => existing
    }
    result.push(updated)
    i += 1
  }
  result.push(node)
  result
}

///|
fn add_child(node : BackupNode, childId : Int) -> BackupNode {
  let children = node.childIds.copy()
  children.push(childId)
  {
    id: node.id,
    parentId: node.parentId,
    childIds: children,
    timestamp: node.timestamp,
    state: node.state,
  }
}

///|
fn backup_meta(node : BackupNode) -> BackupMeta {
  {
    id: node.id,
    parentId: node.parentId,
    childIds: node.childIds.copy(),
    timestamp: node.timestamp,
  }
}

///|
fn find_backup_node(backups : Array[BackupNode], id : Int) -> BackupNode? {
  let len = backups.length()
  let mut i = 0
  while i < len {
    let node = backups[i]
    if node.id == id {
      return Some(node)
    }
    i += 1
  }
  None
}
