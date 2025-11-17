import React, { JSX, useCallback, useEffect, useMemo, useState } from "react";
import {
  load_from_json,
  save_to_json,
  make_wall,
  make_prop_box,
  make_implication_box,
  make_and_box,
  make_pi1_box,
  make_pi2_box,
  make_negation_box,
  make_negation_box_with_inner,
  kind_to_label,
  kind_to_string,
  compose_kind,
} from "../../singularity/target/js/release/build/cs.js";
import { styleForKind } from "../utils.js";
import {
  CELL_DATA,
  TOOLBAR,
  TOOL_DATA,
  ToolId,
  clampLevelEntities,
  clearSelectedCell,
  cloneLevelData,
  computeNextBoxId,
  createEmptyLevel,
  createInitialState,
  deleteColumnAt,
  deleteRowAt,
  insertColumnAt,
  insertRowAt,
  isCellEmpty,
} from "./state";
import {
  isTypingTarget,
  openFormModal,
  promptForKindInput,
  promptForTextInput,
} from "./modals";
import "../editor.css";
import { usePlaceTool } from "./hooks/usePlaceTool";

import { Level, LevelBox, Vector2 } from "../types";

interface EditorStatus {
  text: string;
  isError?: boolean;
}

function useEditorState() {
  const [state, setState] = useState(createInitialState);
  const [status, setStatus] = useState<EditorStatus>({
    text: "就绪",
  });

  const updateState = useCallback((updater: (draft: typeof state) => void) => {
    setState((prev) => {
      const next = {
        ...prev,
        level: cloneLevelData(prev.level),
        selectedCell: prev.selectedCell ? { ...prev.selectedCell } : null,
        undoStack: prev.undoStack.map((lvl) => cloneLevelData(lvl)),
      };
      updater(next);
      return next;
    });
  }, []);

  const pushHistory = useCallback(() => {
    updateState((draft) => {
      draft.undoStack.push(cloneLevelData(draft.level));
      if (draft.undoStack.length > 50) {
        draft.undoStack.shift();
      }
    });
  }, [updateState]);

  const applyStatus = useCallback((text: string, isError = false) => {
    setStatus({ text, isError });
  }, []);

  return { state, updateState, pushHistory, status, applyStatus, setState };
}

function EditorApp() {
  const { state, updateState, pushHistory, status, applyStatus, setState } =
    useEditorState();

  const setStatus = applyStatus;

  const boxAt = useCallback(
    (x: number, y: number) =>
      state.level.boxes.find((box) => box.pos.x === x && box.pos.y === y),
    [state.level.boxes]
  );

  const goalAt = useCallback(
    (x: number, y: number) =>
      state.level.goals.find((goal) => goal.pos.x === x && goal.pos.y === y),
    [state.level.goals]
  );

  const setSelectedCell = useCallback(
    (cell: Vector2 | null) => {
      updateState((draft) => {
        draft.selectedCell = cell;
      });
    },
    [updateState]
  );

  const setLevel = useCallback(
    (lvl: Level) => {
      setState((prev) => {
        const nextLevel = cloneLevelData(lvl);
        const next = {
          ...prev,
          level: nextLevel,
          selectedCell: null,
          nextBoxId: computeNextBoxId(nextLevel.boxes),
          undoStack: [],
        };
        clampLevelEntities(next);
        return next;
      });
      setStatus("已加载关卡");
    },
    [setState, setStatus]
  );

  const undo = useCallback(() => {
    setState((prev) => {
      const snapshot = prev.undoStack[prev.undoStack.length - 1];
      if (!snapshot) {
        setStatus("没有可撤销的操作", true);
        return prev;
      }
      const remaining = prev.undoStack.slice(0, -1);
      const level = cloneLevelData(snapshot);
      const next = {
        ...prev,
        level,
        undoStack: remaining,
        selectedCell: null,
        nextBoxId: computeNextBoxId(level.boxes),
      };
      clampLevelEntities(next);
      setStatus("已撤销上一次编辑");
      return next;
    });
  }, [setState, setStatus]);

  const placeTool = usePlaceTool({
    state,
    boxAt,
    goalAt,
    pushHistory,
    updateState,
    setSelectedCell,
    setStatus,
  });

  // moveEntity and placeTool are defined together below to avoid TDZ.

  const moveEntity = useCallback(
    (
      payload: { type: "box" | "goal" | "player"; x: number; y: number },
      tx: number,
      ty: number
    ) => {
      if (payload.x === tx && payload.y === ty) {
        setSelectedCell({ x: tx, y: ty });
        return;
      }
      if (!isCellEmpty(state, tx, ty)) {
        setStatus("目标格已有内容，无法移动", true);
        return;
      }
      updateState((draft) => {
        switch (payload.type) {
          case "box": {
            const box = draft.level.boxes.find(
              (b) => b.pos.x === payload.x && b.pos.y === payload.y
            );
            if (!box) return;
            pushHistory();
            box.pos = { x: tx, y: ty };
            break;
          }
          case "goal": {
            const goal = draft.level.goals.find(
              (g) => g.pos.x === payload.x && g.pos.y === payload.y
            );
            if (!goal) return;
            pushHistory();
            goal.pos = { x: tx, y: ty };
            break;
          }
          case "player":
            pushHistory();
            draft.level.player = { x: tx, y: ty };
            break;
        }
      });
      setStatus("已移动元素");
    },
    [pushHistory, setSelectedCell, setStatus, state, updateState]
  );

  const handleDrop = useCallback(
    async (x: number, y: number, data: DataTransfer | null) => {
      const payload = data?.getData(CELL_DATA);
      if (payload) {
        const parsed = JSON.parse(payload) as {
          type: "box" | "goal" | "player";
          x: number;
          y: number;
        };
        moveEntity(parsed, x, y);
        return;
      }
      const tool =
        (data?.getData(TOOL_DATA) as ToolId | undefined) ?? undefined;
      if (!tool) return;
      await placeTool(tool, x, y);
    },
    [moveEntity, placeTool]
  );

  const handleCellDoubleClick = useCallback(
    async (x: number, y: number) => {
      setSelectedCell({ x, y });
      if (boxAt(x, y)) {
        if (await editBox(x, y)) {
          setStatus("已更新方块 Kind");
        }
        return;
      }
      if (goalAt(x, y)) {
        if (await editGoal(x, y)) {
          setStatus("已更新 Goal");
        }
        return;
      }
      await placeTool("player", x, y);
    },
    [boxAt, goalAt, placeTool, setSelectedCell, setStatus]
  );

  const renderProps = useMemo(
    () => ({
      onDrop: (x: number, y: number, data: DataTransfer | null) =>
        handleDrop(x, y, data),
      onClick: (x: number, y: number) => setSelectedCell({ x, y }),
      onDoubleClick: (x: number, y: number) => handleCellDoubleClick(x, y),
    }),
    [handleDrop, handleCellDoubleClick, setSelectedCell]
  );

  const editBox = useCallback(
    async (x: number, y: number) => {
      const box = boxAt(x, y);
      if (!box) return false;
      const parsed = await promptForKindInput(
        {
          title: "编辑方块 Kind",
          description: "输入逻辑表达式，例如 A -> B、!(A & B)、fst (A & B)",
          defaultValue: kind_to_string(box.kind),
          confirmLabel: "保存方块",
        },
        compose_kind,
        setStatus
      );
      if (!parsed || (parsed as any).$tag === 0) {
        return false;
      }
      pushHistory();
      updateState((draft) => {
        const target = draft.level.boxes.find(
          (b) => b.pos.x === x && b.pos.y === y
        );
        if (target) {
          target.kind = (parsed as any)._0;
        }
      });
      setStatus("已保存方块");
      return true;
    },
    [boxAt, pushHistory, setStatus, updateState]
  );

  const editGoal = useCallback(
    async (x: number, y: number) => {
      const goal = goalAt(x, y);
      if (!goal) return false;
      const parsed = await promptForKindInput(
        {
          title: "编辑 Goal",
          description: "输入逻辑表达式，例如 A、A & B、!fst X",
          defaultValue: kind_to_string(goal.prop),
          confirmLabel: "保存 Goal",
        },
        compose_kind,
        setStatus
      );
      if (!parsed || (parsed as any).$tag === 0) {
        return false;
      }
      pushHistory();
      updateState((draft) => {
        const target = draft.level.goals.find(
          (g) => g.pos.x === x && g.pos.y === y
        );
        if (target) {
          target.prop = (parsed as any)._0;
        }
      });
      setStatus("已保存 Goal");
      return true;
    },
    [goalAt, pushHistory, setStatus, updateState]
  );

  const deleteSelectedCell = useCallback(() => {
    const cell = state.selectedCell;
    if (!cell) {
      setStatus("请选择要删除的节点", true);
      return;
    }
    const { x, y } = cell;
    const hasBox = boxAt(x, y);
    const hasGoal = goalAt(x, y);
    const hasPlayer = state.level.player.x === x && state.level.player.y === y;
    if (!hasBox && !hasGoal && !hasPlayer) {
      setStatus("该格没有可删除的节点", true);
      return;
    }
    pushHistory();
    updateState((draft) => {
      draft.level.boxes = draft.level.boxes.filter(
        (b) => !(b.pos.x === x && b.pos.y === y)
      );
      draft.level.goals = draft.level.goals.filter(
        (g) => !(g.pos.x === x && g.pos.y === y)
      );
      if (draft.level.player.x === x && draft.level.player.y === y) {
        draft.level.player = { x: 0, y: 0 };
      }
      draft.selectedCell = null;
    });
    setStatus("已删除选中节点");
  }, [
    boxAt,
    goalAt,
    pushHistory,
    setStatus,
    state.level.player,
    state.selectedCell,
    updateState,
  ]);

  const insertColumnRelative = useCallback(
    (direction: "left" | "right") => {
      const cell = state.selectedCell;
      if (!cell) {
        setStatus("请先选中一个格子", true);
        return;
      }
      const index = direction === "left" ? cell.x : cell.x + 1;
      pushHistory();
      setState((prev) => {
        const next = {
          ...prev,
          level: cloneLevelData(prev.level),
          selectedCell: prev.selectedCell ? { ...prev.selectedCell } : null,
          undoStack: prev.undoStack.map(cloneLevelData),
        };
        if (!insertColumnAt(next, index)) {
          setStatus("无法新增列", true);
          return prev;
        }
        clampLevelEntities(next);
        return next;
      });
      setStatus(
        direction === "left"
          ? "已在选中格子左侧新增一列"
          : "已在选中格子右侧新增一列"
      );
    },
    [setState, setStatus, state.selectedCell]
  );

  const insertRowRelative = useCallback(
    (direction: "up" | "down") => {
      const cell = state.selectedCell;
      if (!cell) {
        setStatus("请先选中一个格子", true);
        return;
      }
      const index = direction === "up" ? cell.y : cell.y + 1;
      pushHistory();
      setState((prev) => {
        const next = {
          ...prev,
          level: cloneLevelData(prev.level),
          selectedCell: prev.selectedCell ? { ...prev.selectedCell } : null,
          undoStack: prev.undoStack.map(cloneLevelData),
        };
        if (!insertRowAt(next, index)) {
          setStatus("无法新增行", true);
          return prev;
        }
        clampLevelEntities(next);
        return next;
      });
      setStatus(
        direction === "up"
          ? "已在选中格子上方新增一行"
          : "已在选中格子下方新增一行"
      );
    },
    [setState, setStatus, state.selectedCell]
  );

  const deleteSelectedColumn = useCallback(() => {
    const cell = state.selectedCell;
    if (!cell) {
      setStatus("请先选中一个格子", true);
      return;
    }
    pushHistory();
    setState((prev) => {
      const next = {
        ...prev,
        level: cloneLevelData(prev.level),
        selectedCell: prev.selectedCell ? { ...prev.selectedCell } : null,
        undoStack: prev.undoStack.map(cloneLevelData),
      };
      if (!deleteColumnAt(next, cell.x)) {
        setStatus("无法删除列", true);
        return prev;
      }
      clampLevelEntities(next);
      return next;
    });
    setStatus("已删除选中列");
  }, [setState, setStatus, state.selectedCell]);

  const deleteSelectedRow = useCallback(() => {
    const cell = state.selectedCell;
    if (!cell) {
      setStatus("请先选中一个格子", true);
      return;
    }
    pushHistory();
    setState((prev) => {
      const next = {
        ...prev,
        level: cloneLevelData(prev.level),
        selectedCell: prev.selectedCell ? { ...prev.selectedCell } : null,
        undoStack: prev.undoStack.map(cloneLevelData),
      };
      if (!deleteRowAt(next, cell.y)) {
        setStatus("无法删除行", true);
        return prev;
      }
      clampLevelEntities(next);
      return next;
    });
    setStatus("已删除选中行");
  }, [setState, setStatus, state.selectedCell]);

  const updateMetadata = useCallback(
    (field: keyof Level["info"], value: string) => {
      pushHistory();
      setState((prev) => {
        const next = {
          ...prev,
          level: cloneLevelData(prev.level),
          selectedCell: prev.selectedCell ? { ...prev.selectedCell } : null,
          undoStack: prev.undoStack.map(cloneLevelData),
        };
        const info = { ...next.level.info };
        switch (field) {
          case "id":
          case "gridWidth":
          case "gridHeight":
          case "cellSize":
            info[field] = Math.max(1, Number(value) || info[field]) as any;
            break;
          default:
            (info as any)[field] = value;
        }
        next.level.info = info;
        clampLevelEntities(next);
        next.nextBoxId = computeNextBoxId(next.level.boxes);
        return next;
      });
      setStatus("已更新关卡信息");
    },
    [pushHistory, setState, setStatus]
  );

  const loadFromJson = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setStatus("请输入 JSON 字符串", true);
        return;
      }
      try {
        const parsed = load_from_json(value);
        if (!parsed || (parsed as any).$tag === 0) {
          throw new Error("无效的 Level JSON");
        }
        setLevel(parsed._0 as Level);
        clearSelectedCell(state);
      } catch (error) {
        console.error(error);
        setStatus("加载 JSON 失败，请检查格式", true);
      }
    },
    [setLevel, setStatus, state]
  );

  const exportJson = useCallback(() => {
    try {
      const payload = save_to_json(state.level);
      navigator.clipboard?.writeText(payload).catch(() => {});
      setStatus("已导出 JSON，并复制到剪贴板");
      return payload;
    } catch (error) {
      console.error(error);
      setStatus("导出失败", true);
      return "";
    }
  }, [setStatus, state.level]);

  const placeWallShortcut = useCallback(() => {
    if (!state.selectedCell) {
      setStatus("请先选中一个格子", true);
      return;
    }
    const { x, y } = state.selectedCell;
    void placeTool("wall", x, y);
  }, [placeTool, setStatus, state.selectedCell]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) {
        return;
      }
      if (event.key === "z" || event.key === "Z") {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        deleteSelectedCell();
        return;
      }
      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        void handleCellDoubleClick(
          state.selectedCell?.x ?? state.level.player.x,
          state.selectedCell?.y ?? state.level.player.y
        );
        return;
      }
      if (event.key === "w" || event.key === "W") {
        event.preventDefault();
        placeWallShortcut();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    deleteSelectedCell,
    handleCellDoubleClick,
    placeWallShortcut,
    state.level.player.x,
    state.level.player.y,
    state.selectedCell,
    undo,
  ]);

  return (
    <div className="editor-layout">
      <div className="editor-left">
        <MetadataPanel
          info={state.level.info}
          onChange={updateMetadata}
          onReset={() => setLevel(createEmptyLevel())}
        />
        <StructurePanel
          onInsertRowUp={() => insertRowRelative("up")}
          onInsertRowDown={() => insertRowRelative("down")}
          onDeleteRow={deleteSelectedRow}
          onInsertColLeft={() => insertColumnRelative("left")}
          onInsertColRight={() => insertColumnRelative("right")}
          onDeleteCol={deleteSelectedColumn}
        />
        <Grid
          width={state.level.info.gridWidth}
          height={state.level.info.gridHeight}
          cellSize={state.level.info.cellSize}
          boxes={state.level.boxes}
          goals={state.level.goals}
          player={state.level.player}
          selected={state.selectedCell}
          onDrop={renderProps.onDrop}
          onClick={renderProps.onClick}
          onDoubleClick={renderProps.onDoubleClick}
        />
        <ShortcutPanel />
        <IoPanel
          valueIn=""
          valueOut={save_to_json(state.level)}
          onLoad={loadFromJson}
          onExport={exportJson}
        />
        <StatusLine status={status} />
      </div>
      <Toolbar tools={TOOLBAR} />
    </div>
  );
}

function Grid(props: {
  width: number;
  height: number;
  cellSize: number;
  boxes: LevelBox[];
  goals: any[];
  player: Vector2;
  selected: Vector2 | null;
  onDrop: (x: number, y: number, data: DataTransfer | null) => void;
  onClick: (x: number, y: number) => void;
  onDoubleClick: (x: number, y: number) => void;
}) {
  const cellSize = Math.max(props.cellSize, 32);
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${props.width}, ${cellSize}px)`,
      ["--cell-size" as any]: `${cellSize}px`,
    }),
    [props.width, cellSize]
  );
  const boxesMap = useMemo(
    () => new Map(props.boxes.map((b) => [`${b.pos.x}-${b.pos.y}`, b])),
    [props.boxes]
  );
  const goalsMap = useMemo(
    () => new Map(props.goals.map((g) => [`${g.pos.x}-${g.pos.y}`, g])),
    [props.goals]
  );

  const cells: JSX.Element[] = [];
  for (let y = 0; y < props.height; y++) {
    for (let x = 0; x < props.width; x++) {
      const key = `${x}-${y}`;
      const box = boxesMap.get(key);
      const goal = goalsMap.get(key);
      const isPlayer = props.player.x === x && props.player.y === y;
      const isSelected = props.selected?.x === x && props.selected?.y === y;
      cells.push(
        <div
          key={key}
          className={`editor-cell${isSelected ? " selected" : ""}`}
          data-x={x}
          data-y={y}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            props.onDrop(x, y, e.dataTransfer);
          }}
          onClick={() => props.onClick(x, y)}
          onDoubleClick={() => props.onDoubleClick(x, y)}
        >
          {box ? <BoxCell box={box} cellSize={cellSize} /> : null}
          {goal ? <GoalCell goal={goal} /> : null}
          {isPlayer ? <PlayerCell /> : null}
        </div>
      );
    }
  }
  return (
    <div className="editor-panel">
      <div className="editor-grid" style={gridStyle}>
        {cells}
      </div>
    </div>
  );
}

function BoxCell({ box, cellSize }: { box: LevelBox; cellSize: number }) {
  const style = styleForKind(box.kind) as any;
  const fill = `#${(style.fillColor >>> 0).toString(16).padStart(6, "0")}`;
  const border = `#${(style.borderColor >>> 0).toString(16).padStart(6, "0")}`;
  const symbol =
    typeof style.symbol === "string" && style.symbol.trim().length > 0
      ? style.symbol
      : kind_to_label(box.kind);
  return (
    <div
      className="editor-box"
      draggable
      onDragStart={(event) => {
        event.dataTransfer?.setData(
          CELL_DATA,
          JSON.stringify({ type: "box", x: box.pos.x, y: box.pos.y })
        );
        event.dataTransfer?.setDragImage(
          event.currentTarget,
          cellSize / 2,
          cellSize / 2
        );
      }}
      style={{
        background: fill,
        border: `2px solid ${border}`,
      }}
    >
      {symbol}
    </div>
  );
}

function GoalCell({ goal }: { goal: any }) {
  return (
    <div
      className="editor-goal"
      draggable
      onDragStart={(event) => {
        event.dataTransfer?.setData(
          CELL_DATA,
          JSON.stringify({ type: "goal", x: goal.pos.x, y: goal.pos.y })
        );
        event.dataTransfer?.setDragImage(
          event.currentTarget,
          event.currentTarget.clientWidth / 2,
          event.currentTarget.clientHeight / 2
        );
      }}
    >
      {kind_to_label(goal.prop)}
    </div>
  );
}

function PlayerCell() {
  return (
    <div
      className="editor-player"
      draggable
      onDragStart={(event) => {
        event.dataTransfer?.setData(
          CELL_DATA,
          JSON.stringify({ type: "player", x: 0, y: 0 })
        );
        event.dataTransfer?.setDragImage(event.currentTarget, 10, 10);
      }}
    >
      λ
    </div>
  );
}

function Toolbar({ tools }: { tools: typeof TOOLBAR }) {
  return (
    <div className="toolbar">
      <div className="editor-panel">
        <h2>工具箱 (拖动到网格)</h2>
        <div className="toolbar-list">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="toolbar-item"
              draggable
              onDragStart={(event) =>
                event.dataTransfer?.setData(TOOL_DATA, tool.id)
              }
            >
              <span className="toolbar-item__label">{tool.label}</span>
              <span className="toolbar-item__desc">{tool.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StructurePanel(props: {
  onInsertRowUp: () => void;
  onInsertRowDown: () => void;
  onDeleteRow: () => void;
  onInsertColLeft: () => void;
  onInsertColRight: () => void;
  onDeleteCol: () => void;
}) {
  return (
    <div className="editor-panel">
      <h2>结构编辑</h2>
      <div className="structure-row">
        <span>行</span>
        <div className="structure-actions">
          <button type="button" onClick={props.onInsertRowUp}>
            上方 +
          </button>
          <button type="button" onClick={props.onInsertRowDown}>
            下方 +
          </button>
          <button type="button" onClick={props.onDeleteRow}>
            删除行
          </button>
        </div>
      </div>
      <div className="structure-row">
        <span>列</span>
        <div className="structure-actions">
          <button type="button" onClick={props.onInsertColLeft}>
            左侧 +
          </button>
          <button type="button" onClick={props.onInsertColRight}>
            右侧 +
          </button>
          <button type="button" onClick={props.onDeleteCol}>
            删除列
          </button>
        </div>
      </div>
    </div>
  );
}

function MetadataPanel({
  info,
  onChange,
  onReset,
}: {
  info: Level["info"];
  onChange: (key: keyof Level["info"], value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="editor-panel">
      <h2>关卡信息</h2>
      <form
        className="meta-grid"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          form.forEach((value, key) => {
            onChange(key as keyof Level["info"], String(value));
          });
        }}
      >
        <label>
          ID
          <input
            name="id"
            type="number"
            min={1}
            defaultValue={info.id}
            onChange={(e) => onChange("id", e.target.value)}
          />
        </label>
        <label>
          名称
          <input
            name="name"
            defaultValue={info.name}
            onChange={(e) => onChange("name", e.target.value)}
          />
        </label>
        <label>
          描述
          <input
            name="description"
            defaultValue={info.description}
            onChange={(e) => onChange("description", e.target.value)}
          />
        </label>
        <label>
          宽度
          <input
            name="gridWidth"
            type="number"
            min={1}
            defaultValue={info.gridWidth}
            onChange={(e) => onChange("gridWidth", e.target.value)}
          />
        </label>
        <label>
          高度
          <input
            name="gridHeight"
            type="number"
            min={1}
            defaultValue={info.gridHeight}
            onChange={(e) => onChange("gridHeight", e.target.value)}
          />
        </label>
        <label>
          Cell Size
          <input
            name="cellSize"
            type="number"
            min={20}
            defaultValue={info.cellSize}
            onChange={(e) => onChange("cellSize", e.target.value)}
          />
        </label>
        <div className="button-row">
          <button type="submit">应用</button>
          <button type="button" className="secondary" onClick={() => onReset()}>
            新建
          </button>
        </div>
      </form>
    </div>
  );
}

function ShortcutPanel() {
  const shortcuts: { label: string; keys: string }[] = [
    { label: "撤销", keys: "Z" },
    { label: "删除选中", keys: "D" },
    { label: "编辑选中", keys: "E" },
    { label: "快速放置墙", keys: "W" },
  ];
  return (
    <div className="editor-panel">
      <h2>快捷键</h2>
      <ul className="shortcut-list">
        {shortcuts.map((item) => (
          <li key={item.keys}>
            <span>{item.label}</span>
            <span className="shortcut-keys">{item.keys}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IoPanel({
  valueIn,
  valueOut,
  onLoad,
  onExport,
}: {
  valueIn: string;
  valueOut: string;
  onLoad: (value: string) => void;
  onExport: () => string;
}) {
  const [input, setInput] = useState(valueIn);
  const [output, setOutput] = useState(valueOut);

  useEffect(() => {
    setOutput(valueOut);
  }, [valueOut]);

  return (
    <div className="editor-panel">
      <h2>导入 / 导出 JSON</h2>
      <label>粘贴 JSON 并加载</label>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="粘贴 Level JSON..."
      />
      <div className="button-row">
        <button type="button" onClick={() => onLoad(input)}>
          加载 JSON
        </button>
        <button
          type="button"
          onClick={() => {
            const payload = onExport();
            setOutput(payload);
          }}
        >
          导出 JSON
        </button>
      </div>
      <label>导出结果</label>
      <textarea value={output} readOnly />
    </div>
  );
}

function StatusLine({ status }: { status: EditorStatus }) {
  return (
    <div
      className="status-line"
      style={{ color: status.isError ? "#ff7b7b" : "#8fe8ff" }}
    >
      {status.text}
    </div>
  );
}

export default EditorApp;
