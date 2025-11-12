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
  panel.className = "backup-panel";

  const title = document.createElement("h3");
  title.textContent = "BACKUPS";
  title.className = "backup-panel__title";

  const list = document.createElement("div");
  list.className = "backup-panel__list";

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
    empty.className = "backup-panel__empty";
    list.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.dataset.id = item.id;
    card.className = "backup-card";
    if (item.id === activeId) {
      card.classList.add("backup-card--active");
    }

    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = `Backup ${item.id}`;
    img.className = "backup-card__thumbnail";

    const footer = document.createElement("div");
    footer.textContent = formatRelativeTime(item.timestamp);
    footer.className = "backup-card__footer";

    card.appendChild(img);
    card.appendChild(footer);
    card.addEventListener("click", () => onSelect(item.id));
    list.appendChild(card);
  });
}
