///|
/// Undo the last move if history is available
pub fn undo(model : Model) -> Model {
  match model.history {
    Empty => model
    More(snapshot, tail=rest) => {
      let moveLog = trim_move_log(model.moveLog)
      let boxes = snapshot.boxes.copy()
      {
        ..model,
        player: snapshot.player,
        boxes,
        hoveredBoxId: None,
        history: rest,
        moveLog,
        isComplete: goals_completed(boxes, model.goals),
      }
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
    ..self,
    backups: updatedBackups,
    activeBackupId: Some(newId),
    nextBackupId: newId,
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
    history: model.history,
    moveLog: model.moveLog,
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
  let history = state.history
  let moveLog = state.moveLog
  {
    ..model,
    player: state.player,
    boxes,
    hoveredBoxId: state.hoveredBoxId,
    history,
    moveLog,
    isComplete: goals_completed(boxes, model.goals),
    activeBackupId: Some(activeId),
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
  backups.search_by(node => node.id == id).map(idx => backups[idx])
}
