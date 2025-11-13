import { kind_to_label } from "../singularity/target/js/release/build/cs";
import { Kind } from "./types";

export const COLORS = {
  GRID: 0x444444,
  PLAYER_FILL: 0x222233,
  PLAYER_BORDER: 0x00ffff,
  BOX_FILL: 0x332222,
  BOX_BORDER: 0xffa500,
  WALL_FILL: 0x2c2c2c,
  WALL_BORDER: 0x0f0f0f,
  GOAL: 0x2ef5a0,
  GOAL_COMPLETE: 0xf5d142,
  PROP_FILL: 0x1f8a70,
  PROP_BORDER: 0x4efee8,
  IMPLICATION_FILL: 0x6a381f,
  IMPLICATION_BORDER: 0xff7f3d,
  AND_FILL: 0x352070,
  AND_BORDER: 0xa66aff,
  PI1_FILL: 0x0c3c7a,
  PI1_BORDER: 0x3ab0ff,
  PI2_FILL: 0x0c3c7a,
  PI2_BORDER: 0x3ab0ff,
  NEG_FILL: 0xFFC4C4,
  NEG_BORDER: 0xEE6983,
};

export function styleForKind(kind: Kind): {
  fillColor: number;
  borderColor: number;
  symbol: string;
  borderWidth?: number;
} {
  let label = kind_to_label(kind);
  switch (label) {
    case "Wall":
      return {
        fillColor: COLORS.WALL_FILL,
        borderColor: COLORS.WALL_BORDER,
        symbol: "",
        borderWidth: 0,
      };
    case "→":
      return {
        fillColor: COLORS.IMPLICATION_FILL,
        borderColor: COLORS.IMPLICATION_BORDER,
        symbol: "→",
      };
    case "∧":
      return {
        fillColor: COLORS.AND_FILL,
        borderColor: COLORS.AND_BORDER,
        symbol: "∧",
      };
    case "π₁":
      return {
        fillColor: COLORS.PI1_FILL,
        borderColor: COLORS.PI1_BORDER,
        symbol: "π₁",
      };
    case "π₂":
      return {
        fillColor: COLORS.PI2_FILL,
        borderColor: COLORS.PI2_BORDER,
        symbol: "π₂",
      };
    case "¬":
      return {
        fillColor: COLORS.NEG_FILL,
        borderColor: COLORS.NEG_BORDER,
        symbol: "¬",
      };
    default:
      return {
        fillColor: COLORS.PROP_FILL,
        borderColor: COLORS.PROP_BORDER,
        symbol: label,
      };
  }
}
