import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Edit3, Trash2 } from "lucide-react";
import { LEVELS } from "../game/data/levels.js";
import { playGlobalNavSound } from "../game/audio.js";
import { useFocusSound } from "./useFocusSound.js";

const IS_DEV = import.meta.env.DEV || Boolean(window.edgecase?.isDev);

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function mergeLevels(devLevels, devLevelsLoaded) {
  if (!IS_DEV) {
    return LEVELS;
  }

  if (devLevelsLoaded) {
    return devLevels;
  }

  const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
  for (const level of devLevels) {
    levelsById.set(level.id, level);
  }
  return Array.from(levelsById.values());
}

function formatFieldWidth(level) {
  return `${level.worldWidth || 4300}px field`;
}

export function LevelSelectScreen({
  initialDevLevels,
  initialDevLevelsLoaded,
  onBack,
  onDeleteLevel,
  onEditLevel,
  onLevelsLoaded,
  onPlayLevel
}) {
  const screenRef = useRef(null);
  const gridRef = useRef(null);
  const itemRefs = useRef([]);
  const [devLevels, setDevLevels] = useState(() => initialDevLevels || []);
  const [devLevelsLoaded, setDevLevelsLoaded] = useState(() => Boolean(initialDevLevelsLoaded));
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [gridScrollable, setGridScrollable] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  useFocusSound(selectedIndex);

  const levels = useMemo(() => mergeLevels(devLevels, devLevelsLoaded), [devLevels, devLevelsLoaded]);

  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    function measureGridOverflow() {
      const grid = gridRef.current;
      if (!grid) {
        return;
      }

      setGridScrollable(grid.scrollHeight > grid.clientHeight + 8);
    }

    measureGridOverflow();
    window.addEventListener("resize", measureGridOverflow);
    window.visualViewport?.addEventListener("resize", measureGridOverflow);

    return () => {
      window.removeEventListener("resize", measureGridOverflow);
      window.visualViewport?.removeEventListener("resize", measureGridOverflow);
    };
  }, [levels]);

  useEffect(() => {
    if (!IS_DEV || !window.edgecase?.loadLevels) {
      return;
    }

    let mounted = true;

    async function refreshDevLevels() {
      try {
        const loadedLevels = await window.edgecase.loadLevels();
        if (!mounted || !Array.isArray(loadedLevels) || !loadedLevels.length) {
          return;
        }

        setDevLevels(loadedLevels);
        setDevLevelsLoaded(true);
        onLevelsLoaded(loadedLevels, true);
      } catch (error) {
        if (mounted) {
          setStatusMessage(error?.message || "Could not refresh saved levels.");
        }
      }
    }

    refreshDevLevels();

    return () => {
      mounted = false;
    };
  }, [onLevelsLoaded]);

  const scrollSelectedIntoView = useCallback((index) => {
    itemRefs.current[index]?.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
  }, []);

  const moveSelection = useCallback((delta) => {
    if (!levels.length) {
      return;
    }

    setSelectedIndex((current) => {
      const fallback = delta < 0 ? levels.length - 1 : 0;
      const next = current === null
        ? fallback
        : Math.max(0, Math.min(levels.length - 1, current + delta));
      window.requestAnimationFrame(() => scrollSelectedIntoView(next));
      return next;
    });
  }, [levels.length, scrollSelectedIntoView]);

  const playSelected = useCallback(() => {
    if (selectedIndex === null) {
      return;
    }

    const level = levels[selectedIndex];
    if (level) {
      onPlayLevel(level.id);
    }
  }, [levels, onPlayLevel, selectedIndex]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat) {
        return;
      }

      if (["ArrowLeft", "KeyA"].includes(event.code)) {
        event.preventDefault();
        moveSelection(-1);
      } else if (["ArrowRight", "KeyD"].includes(event.code)) {
        event.preventDefault();
        moveSelection(1);
      } else if (["ArrowUp", "KeyW"].includes(event.code)) {
        event.preventDefault();
        moveSelection(-4);
      } else if (["ArrowDown", "KeyS"].includes(event.code)) {
        event.preventDefault();
        moveSelection(4);
      } else if (["Space", "Enter"].includes(event.code)) {
        event.preventDefault();
        playSelected();
      } else if (event.code === "Escape") {
        event.preventDefault();
        onBack();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [moveSelection, onBack, playSelected]);

  const handleDeleteLevel = useCallback(async (level) => {
    if (!window.edgecase?.deleteLevel) {
      return;
    }

    if (levels.length <= 1) {
      setStatusMessage("At least one level is required.");
      return;
    }

    if (!window.confirm(`Delete level "${level.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await window.edgecase.deleteLevel(level.id);
      const loadedLevels = window.edgecase.loadLevels ? await window.edgecase.loadLevels() : [];
      const nextLevels = Array.isArray(loadedLevels) ? loadedLevels : [];
      setDevLevels(nextLevels);
      setDevLevelsLoaded(true);
      onDeleteLevel(level.id, nextLevels);
      setSelectedIndex((current) => current === null ? null : Math.min(current, Math.max(0, nextLevels.length - 1)));
      setStatusMessage(`Deleted ${level.name}`);
    } catch (error) {
      setStatusMessage(error?.message || "Could not delete level.");
    }
  }, [levels.length, onDeleteLevel]);

  return (
    <section
      ref={screenRef}
      tabIndex={-1}
      className="level-select-screen absolute inset-0 z-[5] overflow-hidden bg-[radial-gradient(circle_at_27%_42%,rgba(12,69,55,0.18),transparent_28%),linear-gradient(180deg,#010807_0%,#03100e_52%,#010605_100%)] font-['Cascadia_Mono',Consolas,monospace] text-[#edf8ed] outline-none before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(73,180,150,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(73,180,150,0.025)_1px,transparent_1px)] before:bg-[size:26px_26px] before:content-[''] before:[mask-image:linear-gradient(90deg,transparent_0%,#000_46%,#000_100%)]"
      aria-label="Level select"
    >
      <header className="relative z-[2] flex items-start justify-between gap-8">
        <div>
          <h1 className="page-title">SELECT LEVEL</h1>
          <p className="level-select-subtitle">CHOOSE / PLAY / EDIT</p>
        </div>
        <button
          type="button"
          className="settings-back"
          onFocus={playGlobalNavSound}
          onMouseEnter={playGlobalNavSound}
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" strokeWidth={4} />
          <span>BACK</span>
        </button>
      </header>

      <div
        ref={gridRef}
        className={cx("level-card-grid relative z-[2] grid pr-2", gridScrollable && "level-card-grid--scrollable")}
      >
        {levels.length ? levels.map((level, index) => {
          const focused = selectedIndex === index;
          return (
            <article
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              key={level.id}
              className={cx(
                "level-card relative grid cursor-pointer rounded-lg border-[3px] bg-[rgba(3,33,27,0.68)] before:pointer-events-none before:absolute before:inset-[-6px] before:rounded-[10px] before:border before:border-transparent before:content-['']",
                focused
                  ? "border-[#d6b548] bg-[rgba(25,48,31,0.94)] shadow-[inset_0_0_24px_rgba(184,143,38,0.12),0_0_4px_rgba(235,199,76,0.76),0_0_10px_rgba(226,170,46,0.54),0_0_22px_rgba(184,132,32,0.34),0_0_38px_rgba(116,78,18,0.18)]"
                  : "border-[rgba(36,86,74,0.86)] shadow-[inset_0_0_18px_rgba(18,82,65,0.18),0_0_14px_rgba(15,77,61,0.14)]"
              )}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => onPlayLevel(level.id)}
            >
              <div className="level-card-copy min-w-0">
                <div className="level-card-number text-sm font-extrabold text-[#8fa89d]">{String(index + 1).padStart(2, "0")}</div>
                <h2 className={cx("m-0 font-[Bungee,EdgecaseTitle,Bahnschrift,Impact,sans-serif] font-normal leading-none", focused ? "text-[#d7bd4e]" : "text-[#f2f6e7]")}>
                  {level.name || "Untitled"}
                </h2>
                <p className="mt-3 mb-0 font-bold text-[#b8c7b5]">{formatFieldWidth(level)}</p>
              </div>

              <div className="level-card-actions flex items-start justify-end gap-2">
                {IS_DEV ? (
                  <>
                    <button
                      type="button"
                      className="level-icon-button"
                      aria-label={`Edit ${level.name || "level"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditLevel(level);
                      }}
                    >
                      <Edit3 aria-hidden="true" strokeWidth={3.4} />
                    </button>
                    <button
                      type="button"
                      className="level-icon-button level-icon-button--danger"
                      aria-label={`Delete ${level.name || "level"}`}
                      disabled={levels.length <= 1 || !window.edgecase?.deleteLevel}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteLevel(level);
                      }}
                    >
                      <Trash2 aria-hidden="true" strokeWidth={3.4} />
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        }) : (
          <div className="rounded-lg border-[3px] border-[#d6b548] bg-[rgba(25,48,31,0.94)] p-10 text-center font-[Bungee,EdgecaseTitle,Bahnschrift,Impact,sans-serif] text-[28px] text-[#f4e786]">
            NO LEVELS AVAILABLE
          </div>
        )}
      </div>

      <div className="settings-status" role="status" aria-live="polite">
        {statusMessage || "Arrows/WASD select | Space/Enter play | Esc back"}
      </div>
    </section>
  );
}
