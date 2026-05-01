import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Monitor, Music, Volume2 } from "lucide-react";
import {
  getBorderlessEnabled,
  getMusicVolume,
  getSoundVolume,
  setBorderlessEnabled,
  setMusicVolume,
  setSoundVolume
} from "../game/settings.js";
import { updateGlobalMusicVolume } from "../game/audio.js";

const ROWS = ["sound", "music", "window"];

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

export function SettingsScreen({ onBack }) {
  const screenRef = useRef(null);
  const [soundVolume, setSoundVolumeState] = useState(() => getSoundVolume());
  const [musicVolume, setMusicVolumeState] = useState(() => getMusicVolume());
  const [borderless, setBorderlessState] = useState(() => getBorderlessEnabled());
  const [windowModeAvailable, setWindowModeAvailable] = useState(() => Boolean(window.edgecase?.setBorderless));
  const [windowModeChecked, setWindowModeChecked] = useState(false);
  const [focusedRow, setFocusedRow] = useState(2);
  const [statusMessage, setStatusMessage] = useState("");

  const showStatus = useCallback((message) => {
    setStatusMessage(message);
    window.clearTimeout(showStatus.timer);
    showStatus.timer = window.setTimeout(() => setStatusMessage(""), 1800);
  }, []);

  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function syncWindowMode() {
      if (!window.edgecase?.getWindowMode) {
        setWindowModeChecked(true);
        return;
      }

      try {
        const mode = await window.edgecase.getWindowMode();
        if (!mounted) return;
        setWindowModeAvailable(true);
        setWindowModeChecked(true);
        setBorderlessState(Boolean(mode?.borderless));
        setBorderlessEnabled(Boolean(mode?.borderless));
      } catch (error) {
        if (!mounted) return;
        setWindowModeAvailable(false);
        setWindowModeChecked(true);
        showStatus(`Could not read window mode: ${error?.message || "unknown error"}`);
      }
    }

    syncWindowMode();

    return () => {
      mounted = false;
      window.clearTimeout(showStatus.timer);
    };
  }, [showStatus]);

  const updateSound = useCallback((value) => {
    setSoundVolumeState(setSoundVolume(clamp01(value)));
  }, []);

  const updateMusic = useCallback((value) => {
    const next = setMusicVolume(clamp01(value));
    setMusicVolumeState(next);
    updateGlobalMusicVolume();
  }, []);

  const toggleWindowMode = useCallback(async () => {
    if (!windowModeAvailable) {
      showStatus("Window mode is available in desktop builds");
      return;
    }

    const previous = borderless;
    const next = !previous;
    setBorderlessState(next);
    setBorderlessEnabled(next);

    try {
      const result = await window.edgecase.setBorderless(next);
      const resolved = Boolean(result?.borderless);
      setBorderlessState(resolved);
      setBorderlessEnabled(resolved);
    } catch (error) {
      setBorderlessState(previous);
      setBorderlessEnabled(previous);
      showStatus(`Could not change window mode: ${error?.message || "unknown error"}`);
    }
  }, [borderless, showStatus, windowModeAvailable]);

  const adjustFocused = useCallback((delta) => {
    const row = ROWS[focusedRow];
    if (row === "sound") {
      updateSound(soundVolume + delta);
    } else if (row === "music") {
      updateMusic(musicVolume + delta);
    } else if (delta !== 0) {
      toggleWindowMode();
    }
  }, [focusedRow, musicVolume, soundVolume, toggleWindowMode, updateMusic, updateSound]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat && !["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
        return;
      }

      if (["ArrowUp", "KeyW"].includes(event.code)) {
        event.preventDefault();
        setFocusedRow((current) => (current + ROWS.length - 1) % ROWS.length);
      } else if (["ArrowDown", "KeyS"].includes(event.code)) {
        event.preventDefault();
        setFocusedRow((current) => (current + 1) % ROWS.length);
      } else if (["ArrowLeft", "KeyA"].includes(event.code)) {
        event.preventDefault();
        adjustFocused(-0.05);
      } else if (["ArrowRight", "KeyD"].includes(event.code)) {
        event.preventDefault();
        adjustFocused(0.05);
      } else if (["Space", "Enter"].includes(event.code)) {
        event.preventDefault();
        if (ROWS[focusedRow] === "window") {
          toggleWindowMode();
        }
      } else if (event.code === "Escape") {
        event.preventDefault();
        onBack();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [adjustFocused, focusedRow, onBack, toggleWindowMode]);

  const windowLabel = useMemo(() => {
    if (!windowModeAvailable && windowModeChecked) return "DESKTOP ONLY";
    return borderless ? "BORDERLESS" : "WINDOWED";
  }, [borderless, windowModeAvailable, windowModeChecked]);

  return (
    <section ref={screenRef} tabIndex={-1} className="settings-screen" aria-label="Settings">
      <header className="settings-header">
        <div>
          <h1 className="page-title">SETTINGS</h1>
          <p>SYSTEM / DISPLAY / AUDIO</p>
        </div>
        <button type="button" className="settings-back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" strokeWidth={4} />
          <span>BACK</span>
        </button>
      </header>

      <div className="settings-panel-list">
        <article
          className={`settings-row ${focusedRow === 0 ? "settings-row--focused" : ""}`}
          onMouseEnter={() => setFocusedRow(0)}
        >
          <div className="settings-icon" aria-hidden="true">
            <Volume2 strokeWidth={3.6} />
          </div>
          <div className="settings-row__copy">
            <h2>SOUND VOLUME</h2>
            <p>Controls jumps, coins, hits, and UI tones</p>
          </div>
          <label className="settings-slider">
            <span className="sr-only">Sound volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={soundVolume}
              style={{ "--slider-value": `${soundVolume * 100}%` }}
              onFocus={() => setFocusedRow(0)}
              onChange={(event) => updateSound(event.target.value)}
            />
          </label>
          <strong className="settings-percent">{percent(soundVolume)}</strong>
        </article>

        <article
          className={`settings-row ${focusedRow === 1 ? "settings-row--focused" : ""}`}
          onMouseEnter={() => setFocusedRow(1)}
        >
          <div className="settings-icon" aria-hidden="true">
            <Music strokeWidth={3.6} />
          </div>
          <div className="settings-row__copy">
            <h2>MUSIC VOLUME</h2>
            <p>Controls background music level</p>
          </div>
          <label className="settings-slider">
            <span className="sr-only">Music volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              style={{ "--slider-value": `${musicVolume * 100}%` }}
              onFocus={() => setFocusedRow(1)}
              onChange={(event) => updateMusic(event.target.value)}
            />
          </label>
          <strong className="settings-percent">{percent(musicVolume)}</strong>
        </article>

        <article
          className={`settings-row settings-row--window ${focusedRow === 2 ? "settings-row--focused" : ""}`}
          onMouseEnter={() => setFocusedRow(2)}
        >
          <div className="settings-icon" aria-hidden="true">
            <Monitor strokeWidth={3.6} />
          </div>
          <div className="settings-row__copy">
            <h2>WINDOW MODE</h2>
            <p>{windowModeAvailable ? "Switches the desktop window presentation" : "Unavailable in browser preview"}</p>
          </div>
          <button
            type="button"
            className="settings-mode-button"
            disabled={!windowModeAvailable}
            onFocus={() => setFocusedRow(2)}
            onClick={toggleWindowMode}
          >
            {windowLabel}
          </button>
        </article>
      </div>

      <div className="settings-status" role="status" aria-live="polite">
        {statusMessage}
      </div>
    </section>
  );
}
