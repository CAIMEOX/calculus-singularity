import React from "react";
import { createRoot } from "react-dom/client";

export interface ModalField {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "number";
  autofocus?: boolean;
}

export interface ModalOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  fields: ModalField[];
}

export interface TextPromptOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  confirmLabel?: string;
  allowEmpty?: boolean;
}

export interface KindPromptOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

export function openFormModal(
  options: ModalOptions
): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const root = createRoot(overlay);

    const close = (result: Record<string, string> | null) => {
      root.unmount();
      overlay.remove();
      resolve(result);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
    };

    function Modal() {
      const firstRef = React.useRef<HTMLInputElement | null>(null);

      React.useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        requestAnimationFrame(() => firstRef.current?.focus());
        return () => document.removeEventListener("keydown", onKeyDown);
      }, []);

      return (
        <div
          className="modal-panel"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <h3>{options.title}</h3>
          {options.description ? <p>{options.description}</p> : null}
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data: Record<string, string> = {};
              options.fields.forEach((field) => {
                const el = overlay.querySelector(
                  `input[name="${field.name}"]`
                ) as HTMLInputElement | null;
                data[field.name] = el?.value ?? "";
              });
              close(data);
            }}
          >
            {options.fields.map((field, index) => (
              <label key={field.name}>
                {field.label}
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder ?? ""}
                  defaultValue={field.defaultValue}
                  ref={index === 0 || field.autofocus ? firstRef : null}
                />
              </label>
            ))}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => close(null)}
              >
                {options.cancelLabel ?? "取消"}
              </button>
              <button type="submit">{options.confirmLabel ?? "确定"}</button>
            </div>
          </form>
        </div>
      );
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close(null);
      }
    });

    root.render(<Modal />);
    document.body.appendChild(overlay);
  });
}

export async function promptForTextInput(
  options: TextPromptOptions,
  setStatus: (text: string, isError?: boolean) => void
): Promise<string | null> {
  let initial = options.defaultValue ?? "";
  while (true) {
    const result = await openFormModal({
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? "确定",
      fields: [
        {
          name: "value",
          label: options.title,
          placeholder: options.description,
          defaultValue: initial,
          autofocus: true,
        },
      ],
    });
    if (!result) {
      return null;
    }
    const value = result.value?.trim() ?? "";
    if (!value && !options.allowEmpty) {
      setStatus("请输入内容", true);
      initial = "";
      continue;
    }
    return value;
  }
}

export function isTypingTarget(el: Element | null) {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el as HTMLElement | null)?.isContentEditable
  );
}

export async function promptForKindInput(
  options: KindPromptOptions,
  composeKind: (expr: string) => any,
  setStatus: (text: string, isError?: boolean) => void
): Promise<any | null> {
  let initial = options.defaultValue ?? "";
  while (true) {
    const result = await openFormModal({
      title: options.title,
      description:
        options.description ?? "语法：使用 !、&、->、fst、snd 以及括号组合命题",
      confirmLabel: options.confirmLabel ?? "确定",
      fields: [
        {
          name: "expression",
          label: "逻辑表达式",
          placeholder: "例如 A -> (B & !C)",
          defaultValue: initial,
          autofocus: true,
        },
      ],
    });
    if (!result) {
      return null;
    }
    const expr = result.expression?.trim() ?? "";
    if (!expr) {
      setStatus("请输入逻辑表达式", true);
      initial = "";
      continue;
    }
    try {
      return composeKind(expr);
    } catch (error) {
      console.error(error);
      setStatus("解析失败，请检查语法", true);
      initial = expr;
    }
  }
}
