import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusSound } from "./useFocusSound.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function EndRunScreen({ state, onAction }) {
  const screenRef = useRef(null);
  const actions = useMemo(() => {
    if (state?.isEditorPlaytest) {
      return [
        { label: "PLAY AGAIN", action: "play-again" },
        { label: "BACK", action: "back-editor" }
      ];
    }

    return [{ label: "NEW RUN", action: "menu" }];
  }, [state?.isEditorPlaytest]);
  const [focusedRow, setFocusedRow] = useState(null);
  useFocusSound(focusedRow);

  const selectFocused = useCallback(() => {
    if (focusedRow === null) {
      return;
    }

    onAction(actions[focusedRow]?.action);
  }, [actions, focusedRow, onAction]);

  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat) {
        return;
      }

      if (["ArrowLeft", "ArrowUp", "KeyA", "KeyW"].includes(event.code)) {
        event.preventDefault();
        setFocusedRow((current) => current === null ? actions.length - 1 : (current + actions.length - 1) % actions.length);
      } else if (["ArrowRight", "ArrowDown", "KeyD", "KeyS"].includes(event.code)) {
        event.preventDefault();
        setFocusedRow((current) => current === null ? 0 : (current + 1) % actions.length);
      } else if (["Space", "Enter"].includes(event.code)) {
        event.preventDefault();
        selectFocused();
      } else if (event.code === "Escape" && state?.isEditorPlaytest) {
        event.preventDefault();
        onAction("back-editor");
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [actions.length, onAction, selectFocused, state?.isEditorPlaytest]);

  if (!state) {
    return null;
  }

  return (
    <section
      ref={screenRef}
      tabIndex={-1}
      className="end-run-screen absolute inset-0 z-[8] grid place-items-center overflow-hidden bg-[rgba(1,8,7,0.82)] font-['Cascadia_Mono',Consolas,monospace] text-[#edf8ed] outline-none"
      aria-label="Run summary"
    >
      <div className="end-run-panel relative z-[2] grid">
        <h1 className="end-run-title">{state.title || "RUN COMPLETE"}</h1>
        <div className="end-run-stats grid">
          <div><span>COINS BANKED</span><strong>{state.coins}</strong></div>
          <div><span>HEALTH LEFT</span><strong>{state.health}/{state.maxHealth}</strong></div>
          <div><span>DIFFICULTY</span><strong>{String(state.difficulty || "normal").toUpperCase()}</strong></div>
        </div>
        <div className="end-run-actions grid">
          {actions.map((item, index) => {
            const focused = focusedRow === index;
            return (
              <button
                key={item.action}
                type="button"
                className={cx(
                  "pause-action-row relative cursor-pointer rounded-lg border-[3px] before:pointer-events-none before:absolute before:inset-[-6px] before:rounded-[10px] before:border before:border-transparent before:content-['']",
                  focused
                    ? "border-[#d6b548] bg-[rgba(25,48,31,0.94)] text-[#d7bd4e] shadow-[inset_0_0_24px_rgba(184,143,38,0.12),0_0_4px_rgba(235,199,76,0.76),0_0_10px_rgba(226,170,46,0.54),0_0_22px_rgba(184,132,32,0.34),0_0_38px_rgba(116,78,18,0.18)]"
                    : "border-[rgba(36,86,74,0.86)] bg-[rgba(3,33,27,0.68)] text-[#f2f6e7] shadow-[inset_0_0_18px_rgba(18,82,65,0.18),0_0_14px_rgba(15,77,61,0.14)]"
                )}
                onMouseEnter={() => setFocusedRow(index)}
                onClick={() => onAction(item.action)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
