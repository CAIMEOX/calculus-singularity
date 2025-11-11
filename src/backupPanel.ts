import { formatRelativeTime } from "./time";

export interface BackupListItem {
  id: string;
  timestamp: number;
  thumbnail: string;
}

export interface BackupPanelElements {
  panel: HTMLElement;
  list: HTMLElement;
}

export function createBackupPanel(): BackupPanelElements {
  const panel = document.createElement("div");
  panel.id = "backup-panel";
  Object.assign(panel.style, {
    width: "220px",
    backgroundColor: "#111",
    color: "#eee",
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: "12px",
    padding: "12px",
    boxSizing: "border-box",
    border: "1px solid #222",
    borderRadius: "6px",
    maxHeight: "900px",
    overflowY: "auto",
  });

  const title = document.createElement("h3");
  title.textContent = "BACKUPS";
  Object.assign(title.style, {
    margin: "0 0 8px 0",
    fontSize: "14px",
    letterSpacing: "1px",
  });

  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "8px";

  panel.appendChild(title);
  panel.appendChild(list);

  return { panel, list };
}

export function renderBackupPanel(
  list: HTMLElement,
  items: BackupListItem[],
  activeId: string | null,
  onSelect: (id: string) => void
) {
  list.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "Press B to save.";
    empty.style.opacity = "0.65";
    list.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.dataset.id = item.id;
    Object.assign(card.style, {
      border: item.id === activeId ? "1px solid #0ff" : "1px solid #333",
      backgroundColor: "#1a1a1a",
      padding: "6px",
      color: "#eee",
      textAlign: "left",
      cursor: "pointer",
      borderRadius: "4px",
    });

    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = `Backup ${item.id}`;
    img.style.width = "100%";
    img.style.borderRadius = "3px";
    img.style.display = "block";
    img.style.marginBottom = "4px";

    const footer = document.createElement("div");
    footer.textContent = formatRelativeTime(item.timestamp);
    footer.style.fontSize = "11px";
    footer.style.opacity = "0.75";

    card.appendChild(img);
    card.appendChild(footer);
    card.addEventListener("click", () => onSelect(item.id));
    list.appendChild(card);
  });
}
