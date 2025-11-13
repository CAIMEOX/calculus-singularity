import * as PIXI from "pixi.js";
import { styleForKind } from "./utils";

export interface BoxStyle {
  size: number;
  fillColor: number;
  borderColor: number;
  borderWidth?: number;
  symbol?: string;
  symbolFont?: string;
}

const baseStyle: BoxStyle = {
  size: 48,
  fillColor: 0x222233,
  borderColor: 0x00ffff,
  borderWidth: 1.5,
  symbolFont: 'bold 24px "Courier New", Courier, monospace',
};

export function createBox(
  style: {
    fillColor: number;
    borderColor: number;
  },
  cellSize: number
): PIXI.Container {
  const finalStyle: BoxStyle = { ...baseStyle, ...style, size: cellSize };
  const boxContainer = new PIXI.Container();
  // boxContainer.width = finalStyle.size;
  // boxContainer.height = finalStyle.size;

  const graphics = new PIXI.Graphics();

  if (finalStyle.borderColor && finalStyle.borderWidth) {
    graphics.lineStyle(finalStyle.borderWidth, finalStyle.borderColor, 1);
  }

  graphics.beginFill(finalStyle.fillColor);
  graphics.drawRoundedRect(1, 1, finalStyle.size - 1, finalStyle.size - 1, 1);
  graphics.endFill();
  boxContainer.addChild(graphics);

  if (finalStyle.symbol) {
    const textColor = finalStyle.borderColor ?? 0xffffff;
    const text = new PIXI.Text(finalStyle.symbol, {
      fontFamily: finalStyle.symbolFont,
      fontSize: finalStyle.size * 2,
      fill: textColor,
      align: "center",
    });
    text.anchor.set(0.5);
    text.x = finalStyle.size / 2;
    text.y = finalStyle.size / 2;
    text.style.fontSize = finalStyle.size * 3;
    boxContainer.addChild(text);
  }

  return boxContainer;
}
