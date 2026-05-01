const SOUND_KEY = "edgecase:soundEnabled";
const BORDERLESS_KEY = "edgecase:borderless";
const SOUND_VOLUME_KEY = "edgecase:soundVolume";
const MUSIC_VOLUME_KEY = "edgecase:musicVolume";
const EDITOR_ZOOM_HUD_VISIBLE_KEY = "edgecase:editorZoomHudVisible";
const EDITOR_GRID_VISIBLE_KEY = "edgecase:editorGridVisible";
const EDITOR_COORDINATES_VISIBLE_KEY = "edgecase:editorCoordinatesVisible";
const EDITOR_DISPLAY_SETTINGS_OPEN_KEY = "edgecase:editorDisplaySettingsOpen";

function clamp01(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, number));
}

function readBoolean(key, fallback) {
  try {
    const value = window.localStorage?.getItem(key);
    if (value === null || value === undefined) {
      return fallback;
    }
    return value === "true";
  } catch {
    return fallback;
  }
}

function writeBoolean(key, value) {
  try {
    window.localStorage?.setItem(key, String(Boolean(value)));
  } catch {
    // Settings are best-effort in restricted browser contexts.
  }
}

function readNumber(key, fallback) {
  try {
    const value = window.localStorage?.getItem(key);
    if (value === null || value === undefined) {
      return fallback;
    }
    return clamp01(value, fallback);
  } catch {
    return fallback;
  }
}

function writeNumber(key, value) {
  try {
    window.localStorage?.setItem(key, String(clamp01(value, 1)));
  } catch {
    // Settings are best-effort in restricted browser contexts.
  }
}

export function getSoundEnabled() {
  return true;
}

export function setSoundEnabled(enabled) {
  writeBoolean(SOUND_KEY, true);
  return true;
}

export function getSoundVolume() {
  return readNumber(SOUND_VOLUME_KEY, 0.85);
}

export function setSoundVolume(value) {
  const volume = clamp01(value, 0.85);
  writeNumber(SOUND_VOLUME_KEY, volume);
  return volume;
}

export function getMusicVolume() {
  return readNumber(MUSIC_VOLUME_KEY, 0.75);
}

export function setMusicVolume(value) {
  const volume = clamp01(value, 0.75);
  writeNumber(MUSIC_VOLUME_KEY, volume);
  return volume;
}

export function getBorderlessEnabled() {
  return readBoolean(BORDERLESS_KEY, false);
}

export function setBorderlessEnabled(enabled) {
  writeBoolean(BORDERLESS_KEY, enabled);
  return Boolean(enabled);
}

export function getEditorZoomHudVisible() {
  return readBoolean(EDITOR_ZOOM_HUD_VISIBLE_KEY, true);
}

export function setEditorZoomHudVisible(visible) {
  writeBoolean(EDITOR_ZOOM_HUD_VISIBLE_KEY, visible);
  return Boolean(visible);
}

export function getEditorGridVisible() {
  return readBoolean(EDITOR_GRID_VISIBLE_KEY, true);
}

export function setEditorGridVisible(visible) {
  writeBoolean(EDITOR_GRID_VISIBLE_KEY, visible);
  return Boolean(visible);
}

export function getEditorCoordinatesVisible() {
  return readBoolean(EDITOR_COORDINATES_VISIBLE_KEY, true);
}

export function setEditorCoordinatesVisible(visible) {
  writeBoolean(EDITOR_COORDINATES_VISIBLE_KEY, visible);
  return Boolean(visible);
}

export function getEditorDisplaySettingsOpen() {
  return readBoolean(EDITOR_DISPLAY_SETTINGS_OPEN_KEY, true);
}

export function setEditorDisplaySettingsOpen(open) {
  writeBoolean(EDITOR_DISPLAY_SETTINGS_OPEN_KEY, open);
  return Boolean(open);
}
