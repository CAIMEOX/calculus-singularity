import React from "react";
import { formatRelativeTime } from "./utils.js";

export interface BackupPanelItem {
  id: string;
  timestamp: number;
  thumbnail: string;
}

export function BackupPanel({
  items,
  activeId,
  onSelect,
}: {
  items: BackupPanelItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div id="backup-panel" className="backup-panel">
      <h3 className="backup-panel__hints-title">HINTS</h3>
      <div className="backup-panel__hints-list">
        {"Z for undo"}
        <br />
        {"R for reset"}
        <br />
        {"B for backup"}
      </div>
      <br />
      <h3 className="backup-panel__title">BACKUPS</h3>
      <div className="backup-panel__list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`backup-card ${
              item.id === activeId ? "backup-card--active" : ""
            }`}
            onClick={() => onSelect(item.id)}
          >
            <img
              src={item.thumbnail}
              alt={`Backup ${item.id}`}
              className="backup-card__thumbnail"
            />
            <div className="backup-card__footer">
              {formatRelativeTime(item.timestamp)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
