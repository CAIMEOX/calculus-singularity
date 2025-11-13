interface MobileControlsOptions {
  mountPoint: HTMLElement;
  onKeyPress: (key: string) => void;
}

interface MobileControlsHandle {
  destroy: () => void;
  update: () => void;
  element: HTMLElement;
}

const LANDSCAPE_MAX_WIDTH = 1400;
const MOBILE_LAYOUT_CLASS = "mobile-landscape";

export function createMobileControls(
  options: MobileControlsOptions
): MobileControlsHandle {
  const { mountPoint, onKeyPress } = options;
  const controls = document.createElement("div");
  controls.className = "mobile-controls";

  // const title = document.createElement("p");
  // title.className = "mobile-controls__label";
  // title.textContent = "Touch Controls";
  // controls.appendChild(title);

  const body = document.createElement("div");
  body.className = "mobile-controls__body";

  const dpad = document.createElement("div");
  dpad.className = "mobile-controls__dpad";

  const actions = document.createElement("div");
  actions.className = "mobile-controls__actions";

  const dpadButtons = [
    { label: "↑", key: "ArrowUp", className: "up" },
    { label: "←", key: "ArrowLeft", className: "left" },
    { label: "→", key: "ArrowRight", className: "right" },
    { label: "↓", key: "ArrowDown", className: "down" },
  ];

  dpadButtons.forEach(({ label, key, className }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mobile-controls__dpad-button mobile-controls__dpad-button--${className}`;
    button.textContent = label;
    attachPressHandler(button, key, onKeyPress);
    dpad.appendChild(button);
  });

  const actionButtons = [
    { label: "R", key: "r", title: "Restart Level" },
    { label: "Z", key: "z", title: "Undo" },
    { label: "B", key: "b", title: "Save Backup" },
  ];

  actionButtons.forEach(({ label, key, title: btnTitle }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-controls__action-button";
    button.textContent = label;
    button.title = btnTitle;
    attachPressHandler(button, key, onKeyPress);
    actions.appendChild(button);
  });

  body.appendChild(dpad);
  body.appendChild(actions);
  controls.appendChild(body);

  mountPoint.appendChild(controls);

  const pointerMedia = window.matchMedia("(pointer: coarse)");
  const orientationMedia = window.matchMedia("(orientation: landscape)");

  const unsubscribePointer = subscribeMedia(pointerMedia, updateVisibility);
  const unsubscribeOrientation = subscribeMedia(
    orientationMedia,
    updateVisibility
  );

  window.addEventListener("resize", updateVisibility);
  window.addEventListener("orientationchange", updateVisibility);

  updateVisibility();

  function updateVisibility() {
    const visible = shouldEnableMobileControls();
    controls.style.display = visible ? "flex" : "none";
    document.body.classList.toggle(MOBILE_LAYOUT_CLASS, visible);
  }

  function destroy() {
    window.removeEventListener("resize", updateVisibility);
    window.removeEventListener("orientationchange", updateVisibility);
    unsubscribePointer();
    unsubscribeOrientation();
    document.body.classList.remove(MOBILE_LAYOUT_CLASS);
    controls.remove();
  }

  return { destroy, update: updateVisibility, element: controls };
}

function attachPressHandler(
  button: HTMLButtonElement,
  key: string,
  onKeyPress: (key: string) => void
) {
  const handler = (event: Event) => {
    event.preventDefault();
    onKeyPress(key);
  };
  if ("onpointerdown" in window) {
    button.addEventListener("pointerdown", handler, { passive: false });
  } else {
    button.addEventListener("touchstart", handler, { passive: false });
    button.addEventListener("mousedown", handler);
  }
}

function subscribeMedia(
  media: MediaQueryList,
  listener: () => void
): () => void {
  if ("addEventListener" in media) {
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }
  media.addListener(listener);
  return () => media.removeListener(listener);
}

function shouldEnableMobileControls(): boolean {
  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;
  return isTouch && isLandscape && window.innerWidth <= LANDSCAPE_MAX_WIDTH;
}
