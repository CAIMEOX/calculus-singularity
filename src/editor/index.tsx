import { createRoot } from "react-dom/client";
import EditorApp from "./App";

const rootElement = document.getElementById("editor-root");
if (!rootElement) {
  throw new Error("Editor root element not found");
}

const root = createRoot(rootElement);
root.render(<EditorApp />);
