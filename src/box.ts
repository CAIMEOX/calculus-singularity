import * as PIXI from "pixi.js";
import { BloomFilter } from "@pixi/filter-bloom";

// ===================================================================
// ELM ARCHITECTURE - VIEW COMPONENT (Box)
// ===================================================================
// This module provides pure view functions for creating box visual components

// Configuration interface defining all visual parameters needed to create a Box
export interface BoxStyle {
  size: number;
  fillColor: number; // Box fill color
  borderColor?: number; // Border color (optional)
  borderWidth?: number; // Border width (optional)
  symbol?: string; // Symbol in the middle of the box (optional)
  symbolFont?: string; // Symbol font
  filters?: PIXI.Filter[]; // Custom filter array (optional)
}

// ===================================================================
// Default Style Factory
// ===================================================================
// Provides a default "cyberpunk glow" style for quick box creation
// This embodies our "digital construction & retro-future" design aesthetic

function getDefaultCyberpunkStyle(): BoxStyle {
  return {
    size: 50,
    fillColor: 0x222233, // Deep blue-purple fill
    borderColor: 0x00ffff, // Neon cyan border
    borderWidth: 2,
    symbolFont: 'bold 24px "Courier New", Courier, monospace',
    filters: [
    //   new BloomFilter(
    //     0.1,
    //     // strength: 4,      // Glow intensity
    //     1 // Glow quality
    //     // threshold: 0.3,   // Brightness threshold
    //     // bloomScale: 1.0,  // Glow spread range
    //   ),
    ],
  };
}

// ===================================================================
// Box Builder (Pure View Function)
// ===================================================================
// This function is the core of this module. It's a factory function responsible
// for creating and returning a configured, visual PIXI.Container object representing a box.
// This is a pure function that takes style configuration and returns a visual element.

export function createBox(style: Partial<BoxStyle> = {}): PIXI.Container {
  // 1. Merge user style with default style
  // User-provided styles will override default styles
  const finalStyle: BoxStyle = { ...getDefaultCyberpunkStyle(), ...style };

  // 2. Create a container to organize all parts of the box
  const boxContainer = new PIXI.Container();
  boxContainer.width = finalStyle.size;
  boxContainer.height = finalStyle.size;

  // 3. Create the box's main graphics (fill and border)
  const graphics = new PIXI.Graphics();

  // Draw border (if defined)
  if (finalStyle.borderColor && finalStyle.borderWidth) {
    graphics.lineStyle(finalStyle.borderWidth, finalStyle.borderColor, 1);
  }

  // Draw fill
  graphics.beginFill(finalStyle.fillColor);
  graphics.drawRect(0, 0, finalStyle.size, finalStyle.size);
  graphics.endFill();

  boxContainer.addChild(graphics);

  // 4. Create symbol text (if defined)
  if (finalStyle.symbol) {
    const textColor = finalStyle.borderColor || 0xffffff; // Symbol color follows border color by default
    const text = new PIXI.Text(finalStyle.symbol, {
      fontFamily: finalStyle.symbolFont,
      fontSize: finalStyle.size * 0.6, // Symbol size
      fill: textColor,
      align: "center",
    });

    // Center the text within the box
    text.anchor.set(0.5);
    text.x = finalStyle.size / 2;
    text.y = finalStyle.size / 2;

    boxContainer.addChild(text);
  }

  // 5. Apply filters
  if (finalStyle.filters) {
    boxContainer.filters = finalStyle.filters;
  }

  return boxContainer;
}
