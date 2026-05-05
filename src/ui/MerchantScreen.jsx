import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusSound } from "./useFocusSound.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const HOLD_MS = 1000;

export function MerchantScreen({ state, onAction }) {
  const screenRef = useRef(null);
  const holdFrameRef = useRef(null);
  const holdStartRef = useRef(0);
  const [focusedRow, setFocusedRow] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const upgrades = useMemo(() => state?.upgrades || [], [state]);
  useFocusSound(focusedRow);

  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  useEffect(() => {
    setFocusedRow(null);
  }, [state]);

  const stopHold = useCallback(() => {
    const wasHolding = Boolean(holdFrameRef.current || holdStartRef.current);
    if (holdFrameRef.current) {
      window.cancelAnimationFrame(holdFrameRef.current);
      holdFrameRef.current = null;
    }
    holdStartRef.current = 0;
    setHoldProgress(0);
    if (wasHolding) {
      onAction({ type: "charge-stop" });
    }
  }, [onAction]);

  const startHold = useCallback((index = focusedRow) => {
    if (index === null) {
      return;
    }

    const item = upgrades[index];
    if (!item) {
      return;
    }

    stopHold();

    if (item.owned || !item.affordable) {
      onAction({ type: "deny", id: item.id });
      stopHold();
      return;
    }

    holdStartRef.current = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - holdStartRef.current) / HOLD_MS);
      setHoldProgress(progress);
      onAction({ type: "charge", progress });

      if (progress >= 1) {
        holdFrameRef.current = null;
        holdStartRef.current = 0;
        setHoldProgress(0);
        onAction({ type: "buy", id: item.id });
        return;
      }

      holdFrameRef.current = window.requestAnimationFrame(tick);
    };

    onAction({ type: "charge-start" });
    holdFrameRef.current = window.requestAnimationFrame(tick);
  }, [focusedRow, onAction, stopHold, upgrades]);

  useEffect(() => stopHold, [stopHold]);

  const focusRow = useCallback((index) => {
    stopHold();
    setFocusedRow(index);
    onAction({ type: "select", index });
  }, [onAction, stopHold]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat) {
        return;
      }

      if (["ArrowUp", "KeyW"].includes(event.code)) {
        event.preventDefault();
        focusRow(focusedRow === null ? upgrades.length - 1 : (focusedRow + upgrades.length - 1) % upgrades.length);
      } else if (["ArrowDown", "KeyS"].includes(event.code)) {
        event.preventDefault();
        focusRow(focusedRow === null ? 0 : (focusedRow + 1) % upgrades.length);
      } else if (["Space", "Enter"].includes(event.code)) {
        event.preventDefault();
        startHold();
      } else if (event.code === "Escape") {
        event.preventDefault();
        stopHold();
        onAction({ type: "close" });
      }
    }

    function handleKeyUp(event) {
      if (["Space", "Enter"].includes(event.code)) {
        stopHold();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [focusRow, focusedRow, onAction, startHold, stopHold, upgrades.length]);

  if (!state) {
    return null;
  }

  return (
    <section
      ref={screenRef}
      tabIndex={-1}
      className="merchant-screen absolute inset-0 z-[8] grid place-items-center overflow-hidden bg-[rgba(1,8,7,0.62)] font-['Cascadia_Mono',Consolas,monospace] text-[#edf8ed] outline-none"
      aria-label="Merchant"
    >
      <div className="merchant-panel relative z-[2] grid">
        <header className="text-center">
          <h1 className="merchant-title">MERCHANT</h1>
          <p>W/S or arrows select. Hold Space/Enter for 1s to buy. Esc closes.</p>
        </header>
        <div className="merchant-row-list grid">
          {upgrades.map((upgrade, index) => {
            const focused = focusedRow === index;
            const progress = focused ? holdProgress : 0;
            return (
              <button
                key={upgrade.id}
                type="button"
                className={cx(
                  "merchant-row relative overflow-hidden rounded-lg border-[3px]",
                  focused
                    ? "border-[#d6b548] bg-[rgba(25,48,31,0.94)] shadow-[inset_0_0_24px_rgba(184,143,38,0.12),0_0_4px_rgba(235,199,76,0.76),0_0_10px_rgba(226,170,46,0.54),0_0_22px_rgba(184,132,32,0.34),0_0_38px_rgba(116,78,18,0.18)]"
                    : upgrade.owned
                      ? "border-[rgba(63,166,143,0.72)] bg-[rgba(39,65,54,0.82)]"
                      : upgrade.affordable
                        ? "border-[rgba(36,86,74,0.86)] bg-[rgba(3,33,27,0.68)] shadow-[inset_0_0_18px_rgba(18,82,65,0.18),0_0_14px_rgba(15,77,61,0.14)]"
                        : "border-[rgba(96,68,57,0.82)] bg-[rgba(32,27,24,0.76)]"
                )}
                onMouseEnter={() => focusRow(index)}
                onMouseDown={() => startHold(index)}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
              >
                <span className="merchant-row__progress" style={{ transform: `scaleX(${progress})` }} />
                <span className={cx("merchant-row__title", focused ? "text-[#d7bd4e]" : upgrade.owned ? "text-[#8ee0c6]" : "text-[#edf8ed]")}>
                  {upgrade.name}
                </span>
                <span className={cx("merchant-row__cost", upgrade.owned ? "text-[#8ee0c6]" : upgrade.affordable ? "text-[#f4e786]" : "text-[#8d7770]")}>
                  {upgrade.owned ? (
                    "OWNED"
                  ) : (
                    <>
                      <span className="merchant-cost-coin" aria-hidden="true" />
                      {upgrade.cost}
                    </>
                  )}
                </span>
                <span className={cx("merchant-row__desc", upgrade.affordable || upgrade.owned ? "text-[#b8c7b5]" : "text-[#8d7770]")}>
                  {upgrade.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
