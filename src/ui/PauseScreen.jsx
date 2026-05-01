import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function PauseScreen({ onAction }) {
  const screenRef = useRef(null);
  const [focusedRow, setFocusedRow] = useState(0);
  const actions = useMemo(() => [
    { label: "RESUME", action: "resume" },
    { label: "RESTART", action: "restart" },
    { label: "SELECT LEVEL", action: "level-select" },
    { label: "MAIN MENU", action: "menu" }
  ], []);

  const selectAction = useCallback((action) => {
    onAction(action);
  }, [onAction]);

  const selectFocused = useCallback(() => {
    selectAction(actions[focusedRow]?.action);
  }, [actions, focusedRow, selectAction]);

  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat) {
        return;
      }

      if (["ArrowUp", "KeyW"].includes(event.code)) {
        event.preventDefault();
        setFocusedRow((current) => (current + actions.length - 1) % actions.length);
      } else if (["ArrowDown", "KeyS"].includes(event.code)) {
        event.preventDefault();
        setFocusedRow((current) => (current + 1) % actions.length);
      } else if (["Space", "Enter"].includes(event.code)) {
        event.preventDefault();
        selectFocused();
      } else if (event.code === "Escape") {
        event.preventDefault();
        selectAction("resume");
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [actions.length, selectAction, selectFocused]);

  return (
    <section
      ref={screenRef}
      tabIndex={-1}
      className="pause-screen absolute inset-0 z-[8] grid place-items-center overflow-hidden bg-[rgba(1,8,7,0.72)] font-['Cascadia_Mono',Consolas,monospace] text-[#edf8ed] outline-none"
      aria-label="Pause menu"
    >
      <div className="pause-panel relative z-[2] grid">
        <h1 className="pause-title">PAUSED</h1>
        <div className="pause-action-list grid">
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
                onClick={() => selectAction(item.action)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="pause-help">W/S or arrows select | Space/Enter choose</div>
      </div>
    </section>
  );
}
