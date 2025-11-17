import React, { useMemo } from "react";
import { generate_panel_content } from "../singularity/target/js/release/build/cs.js";
import { styleForKind } from "./utils.js";
import { InfoPanelData, InfoPanelLine, Kind, ViewModel } from "./types";

export function InfoPanel({
  model,
  nextLevelId,
  nextLevelName,
  canGoNext,
  disabled,
  onNext,
}: {
  model: ViewModel;
  nextLevelId: number | null;
  nextLevelName?: string | null;
  canGoNext: boolean;
  disabled: boolean;
  onNext: () => void;
}) {
  const panelData = useMemo<InfoPanelData>(
    () => generate_panel_content(model),
    [model]
  );
  return (
    <div id="info-panel" className="info-panel">
      <div className="info-panel__content">
        <h3 className="info-panel__title">{panelData.title}</h3>
        <hr className="info-panel__divider" />
        <Stats stats={panelData} />
        <LineSection
          title="Boxes"
          lines={panelData.boxes}
          empty="No boxes to show yet."
        />
        <LineSection
          title="Goals"
          lines={panelData.goals}
          empty="No goals defined."
        />
      </div>
      <div className="info-panel__actions">
        {nextLevelId !== null && (
          <button
            type="button"
            className="info-panel__button info-panel__button--accent"
            hidden={!canGoNext}
            disabled={!canGoNext || disabled}
            onClick={onNext}
          >
            {nextLevelName ? `Next Level: ${nextLevelName}` : "Next Level"}
          </button>
        )}
      </div>
    </div>
  );
}

function Stats({ stats }: { stats: InfoPanelData }) {
  return (
    <dl className="info-panel__stats">
      {stats.stats.map((stat) => (
        <div key={stat.label} className="info-panel__stat">
          <dt className="info-panel__stat-label">{stat.label}</dt>
          <dd className="info-panel__stat-value">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LineSection({
  title,
  lines,
  empty,
}: {
  title: string;
  lines: InfoPanelLine[];
  empty: string;
}) {
  return (
    <section className="info-panel__section">
      <h4 className="info-panel__section-title">{title}</h4>
      {!lines.length ? (
        <p className="info-panel__empty">{empty}</p>
      ) : (
        <ul className="info-panel__line-list">
          {lines.map((line, index) => {
            const { border, text } = resolveLineColors(line);
            return (
              <li
                key={`${line.text}-${index}`}
                className={`info-panel__line info-panel__line--${line.tone}`}
                style={{ borderColor: border, color: text }}
              >
                {line.text}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function resolveLineColors(
  line: InfoPanelLine
): { border: string; text: string } {
  if (line.tone === "hovered") {
    return { border: "#ffffff", text: "#ffffff" };
  }
  const colorFromKind = kindBorderColor(line.kind);
  if (colorFromKind) {
    return { border: colorFromKind, text: colorFromKind };
  }
  return toneFallbackColor(line.tone);
}

function kindBorderColor(kind?: Kind | null): string | null {
  if (!kind) {
    return null;
  }
  const { borderColor } = styleForKind(kind);
  return `#${borderColor.toString(16).padStart(6, "0")}`;
}

function toneFallbackColor(
  tone: InfoPanelLine["tone"]
): { border: string; text: string } {
  switch (tone) {
    case "proved":
      return { border: "#4caf50", text: "#4caf50" };
    case "unexpected":
      return { border: "#ff4d4f", text: "#ff4d4f" };
    default:
      return { border: "#ffffff", text: "#ffffff" };
  }
}
