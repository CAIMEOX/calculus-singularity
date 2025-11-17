import { useCallback } from "react";
import {
  make_and_box,
  make_implication_box,
  make_negation_box,
  make_negation_box_with_inner,
  make_pi1_box,
  make_pi2_box,
  make_prop_box,
  make_wall,
  kind_to_string,
} from "../../../singularity/target/js/release/build/cs.js";
import { ToolId, computeNextBoxId } from "../state";
import {
  promptForKindInput,
  promptForTextInput,
  openFormModal,
} from "../modals";
import { LevelBox } from "../../types";
import { compose_kind } from "../../../singularity/target/js/release/build/cs.js";

interface PlaceToolDeps {
  state: any;
  boxAt: (x: number, y: number) => any;
  goalAt: (x: number, y: number) => any;
  pushHistory: () => void;
  updateState: (updater: (draft: any) => void) => void;
  setSelectedCell: (cell: { x: number; y: number } | null) => void;
  setStatus: (text: string, isError?: boolean) => void;
}

export function usePlaceTool(deps: PlaceToolDeps) {
  const {
    boxAt,
    goalAt,
    setStatus,
    setSelectedCell,
    state,
    pushHistory,
    updateState,
  } = deps;

  return useCallback(
    async (tool: ToolId, x: number, y: number) => {
      if (tool === "erase") {
        if (
          !boxAt(x, y) &&
          !goalAt(x, y) &&
          !(state.level.player.x === x && state.level.player.y === y)
        ) {
          setSelectedCell({ x, y });
          return;
        }
        pushHistory();
        updateState((draft) => {
          draft.level.boxes = draft.level.boxes.filter(
            (b: any) => !(b.pos.x === x && b.pos.y === y)
          );
          draft.level.goals = draft.level.goals.filter(
            (g: any) => !(g.pos.x === x && g.pos.y === y)
          );
          if (draft.level.player.x === x && draft.level.player.y === y) {
            draft.level.player = { x: 0, y: 0 };
          }
          draft.selectedCell = { x, y };
        });
        setStatus("已删除内容");
        return;
      }

      if (tool === "player") {
        pushHistory();
        updateState((draft) => {
          draft.level.player = { x, y };
          draft.selectedCell = { x, y };
        });
        setStatus("已放置玩家");
        return;
      }

      if (tool === "goal") {
        const existingGoal = goalAt(x, y);
        const parsed = await promptForKindInput(
          {
            title: "Goal 目标",
            description: "输入逻辑表达式，例如 A & B、A -> !B、fst (A & B)",
            defaultValue: existingGoal
              ? kind_to_string((existingGoal as any).prop)
              : "A",
            confirmLabel: "保存 Goal",
          },
          compose_kind,
          setStatus
        );
        if (!parsed || (parsed as any).$tag === 0) {
          return;
        }
        pushHistory();
        updateState((draft) => {
          draft.level.goals = draft.level.goals.filter(
            (g: any) => !(g.pos.x === x && g.pos.y === y)
          );
          draft.level.goals.push({
            pos: { x, y },
            prop: (parsed as any)._0,
          });
          draft.selectedCell = { x, y };
        });
        setStatus("已放置 Goal");
        return;
      }

      const existingBox = boxAt(x, y);
      const id = existingBox ? existingBox.id : state.nextBoxId;
      let allocateNewId = !existingBox;
      let newBox: LevelBox | null = null;
      switch (tool) {
        case "wall":
          newBox = make_wall(id, x, y) as LevelBox;
          break;
        case "prop": {
          const label = await promptForTextInput(
            {
              title: "命题块",
              description: "输入命题名称，例如 A、Goal、tmp1",
              defaultValue: "A",
              confirmLabel: "放置命题",
            },
            setStatus
          );
          if (!label) return;
          newBox = make_prop_box(id, x, y, label) as LevelBox;
          break;
        }
        case "implication": {
          const form = await openFormModal({
            title: "蕴涵块",
            description: "填写前件与后件，例如：前件 A，后件 B",
            confirmLabel: "放置蕴涵",
            fields: [
              {
                name: "premise",
                label: "前件",
                placeholder: "A",
                defaultValue: "A",
                autofocus: true,
              },
              {
                name: "conclusion",
                label: "后件",
                placeholder: "B",
                defaultValue: "B",
              },
            ],
          });
          if (!form) return;
          const premise = form.premise?.trim();
          const conclusion = form.conclusion?.trim();
          if (!premise || !conclusion) {
            setStatus("请输入前件和后件", true);
            return;
          }
          newBox = make_implication_box(
            id,
            x,
            y,
            premise,
            conclusion
          ) as LevelBox;
          break;
        }
        case "and": {
          const form = await openFormModal({
            title: "合取块",
            description: "填写左右命题，例如：左 A，右 B",
            confirmLabel: "放置合取",
            fields: [
              {
                name: "left",
                label: "左侧命题",
                placeholder: "A",
                defaultValue: "A",
                autofocus: true,
              },
              {
                name: "right",
                label: "右侧命题",
                placeholder: "B",
                defaultValue: "B",
              },
            ],
          });
          if (!form) return;
          const left = form.left?.trim();
          const right = form.right?.trim();
          if (!left || !right) {
            setStatus("请输入左右命题", true);
            return;
          }
          newBox = make_and_box(id, x, y, left, right) as LevelBox;
          break;
        }
        case "pi1":
          newBox = make_pi1_box(id, x, y) as LevelBox;
          break;
        case "pi2":
          newBox = make_pi2_box(id, x, y) as LevelBox;
          break;
        case "neg": {
          const inner = await promptForTextInput(
            {
              title: "否定块",
              description: "可选输入被否定命题，留空表示通用否定",
              defaultValue: "",
              confirmLabel: "放置否定",
              allowEmpty: true,
            },
            setStatus
          );
          if (inner === null) return;
          newBox = inner
            ? (make_negation_box_with_inner(id, x, y, inner) as LevelBox)
            : (make_negation_box(id, x, y) as LevelBox);
          break;
        }
      }
      if (!newBox) return;
      pushHistory();
      updateState((draft) => {
        draft.level.boxes = draft.level.boxes.filter(
          (b: any) => !(b.pos.x === x && b.pos.y === y)
        );
        draft.level.boxes.push(newBox as LevelBox);
        draft.selectedCell = { x, y };
        draft.nextBoxId = allocateNewId
          ? id + 1
          : computeNextBoxId(draft.level.boxes);
      });
      setStatus(`放置 ${toolLabel(tool)}`);
    },
    [
      boxAt,
      goalAt,
      setSelectedCell,
      setStatus,
      state.level.player.x,
      state.level.player.y,
      state.nextBoxId,
      updateState,
      pushHistory,
    ]
  );
}

function toolLabel(tool: ToolId) {
  switch (tool) {
    case "player":
      return "玩家";
    case "goal":
      return "Goal";
    case "wall":
      return "墙";
    case "prop":
      return "命题块";
    case "implication":
      return "蕴涵";
    case "and":
      return "合取";
    case "pi1":
      return "π₁";
    case "pi2":
      return "π₂";
    case "neg":
      return "否定";
    case "erase":
      return "删除";
    default:
      return "元素";
  }
}
