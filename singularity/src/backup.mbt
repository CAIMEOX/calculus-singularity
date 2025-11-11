///|
/// Undo the last move if history is available
pub fn undo(model : Model) -> Model {
  let len = model.history.length()
  if len == 0 {
    model
  } else {
    let snapshot = model.history[len - 1]
    let trimmed = copy_history_prefix(model.history, len - 1)
    let boxes = clone_boxes(snapshot.boxes)
    {
      player: snapshot.player,
      boxes,
      hoveredBoxId: None,
      gridSize: model.gridSize,
      cellSize: model.cellSize,
      history: trimmed,
      goals: model.goals,
      isComplete: goals_completed(boxes, model.goals),
      backups: model.backups,
      activeBackupId: model.activeBackupId,
      nextBackupId: model.nextBackupId,
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
    gridSize: self.gridSize,
    cellSize: self.cellSize,
    goals: self.goals,
    history: self.history,
    isComplete: self.isComplete,
    backups: updatedBackups,
    activeBackupId: Some(newId),
    nextBackupId: newId,
  }
}

///|
pub fn Model::list_backups(self : Model) -> Array[BackupMeta] {
  build_backup_meta_list(self.backups)
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
    boxes: clone_boxes(model.boxes),
    hoveredBoxId: model.hoveredBoxId,
    history: clone_history(model.history),
  }
}

///|
fn apply_backup_state(
  model : Model,
  state : BackupState,
  activeId : Int,
) -> Model {
  let boxes = clone_boxes(state.boxes)
  let history = clone_history(state.history)
  {
    player: state.player,
    boxes,
    hoveredBoxId: state.hoveredBoxId,
    gridSize: model.gridSize,
    cellSize: model.cellSize,
    goals: model.goals,
    history,
    isComplete: goals_completed(boxes, model.goals),
    backups: model.backups,
    activeBackupId: Some(activeId),
    nextBackupId: model.nextBackupId,
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
  let children = clone_int_array(node.childIds)
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
fn build_backup_meta_list(backups : Array[BackupNode]) -> Array[BackupMeta] {
  let len = backups.length()
  let metas = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    metas.push(backup_meta(backups[i]))
    i += 1
  }
  metas
}

///|
fn backup_meta(node : BackupNode) -> BackupMeta {
  {
    id: node.id,
    parentId: node.parentId,
    childIds: clone_int_array(node.childIds),
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

///|
fn clone_history(history : Array[Snapshot]) -> Array[Snapshot] {
  let len = history.length()
  let copy = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    copy.push(history[i])
    i += 1
  }
  copy
}

///|
fn clone_int_array(values : Array[Int]) -> Array[Int] {
  let len = values.length()
  let copy = Array::new(capacity=len)
  let mut i = 0
  while i < len {
    copy.push(values[i])
    i += 1
  }
  copy
}
