import { useCallback, useEffect, useState } from "react";
import { Hammer, Play, Settings } from "lucide-react";

const IS_DEV = import.meta.env.DEV || Boolean(window.edgecase?.isDev);

export function MenuScreen({ onPlay, onSettings, onLevelMaker }) {
  const [focusedRow, setFocusedRow] = useState(0);
  const actions = [
    {
      label: "PLAY",
      detail: "Choose a level and begin the run",
      icon: Play,
      action: onPlay
    },
    {
      label: "SETTINGS",
      detail: "Adjust system, display, and audio",
      icon: Settings,
      action: onSettings
    }
  ];

  if (IS_DEV) {
    actions.push({
      label: "LEVEL MAKER",
      detail: "Build and tune local challenge maps",
      icon: Hammer,
      action: onLevelMaker
    });
  }

  const selectFocused = useCallback(() => {
    actions[focusedRow]?.action();
  }, [actions, focusedRow]);

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
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions.length, selectFocused]);

  return (
    <section className="settings-screen" aria-label="Main menu">
      <header className="settings-header">
        <div>
          <h1>WISDOM QUEST</h1>
        </div>
      </header>

      <div className="settings-panel-list menu-panel-list">
        {actions.map((item, index) => {
          const Icon = item.icon;
          const focused = focusedRow === index;

          return (
            <article
              key={item.label}
              className={`settings-row settings-row--window menu-row ${focused ? "settings-row--focused" : ""}`}
              onMouseEnter={() => setFocusedRow(index)}
              onClick={item.action}
            >
              <div className="settings-icon" aria-hidden="true">
                <Icon strokeWidth={3.6} />
              </div>
              <div className="settings-row__copy">
                <h2>{item.label}</h2>
                <p>{item.detail}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="settings-status">A/D move | Space jump | E interact | Physical quiz answers use doors</div>
    </section>
  );
}
