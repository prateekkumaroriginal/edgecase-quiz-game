import { getMusicVolume, getSfxEnabled, getSoundEnabled, getSoundVolume } from "./settings.js";

let audioContext = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;
let lastUiSoundAt = 0;

function getAudioContext() {
  if (!getSoundEnabled()) {
    stopGlobalMusic();
    return null;
  }

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    audioContext = new AudioContextClass();
    musicGain = audioContext.createGain();
    musicGain.gain.value = 0.001;
    musicGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  updateGlobalMusicVolume();
  return audioContext;
}

export function startGlobalMusic() {
  const audio = getAudioContext();
  if (!audio || !musicGain || musicTimer) {
    return;
  }

  musicStep = 0;
  playMusicStep();
  musicTimer = window.setInterval(playMusicStep, 420);
}

export function stopGlobalMusic() {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicGain && audioContext) {
    musicGain.gain.setTargetAtTime(0.001, audioContext.currentTime, 0.04);
  }
}

export function updateGlobalMusicVolume() {
  if (!musicGain || !audioContext) {
    return;
  }
  const volume = getSoundEnabled() ? getMusicVolume() * 0.32 : 0;
  musicGain.gain.setTargetAtTime(Math.max(0.001, volume), audioContext.currentTime, 0.08);
}

export function installGlobalAudioUnlock() {
  startGlobalMusic();
  const unlock = () => startGlobalMusic();
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  document.addEventListener("click", handleGlobalButtonClick, { capture: true });
}

export function playGlobalNavSound() {
  playUiTone("nav");
}

export function playGlobalClickSound() {
  playUiTone("click");
}

function playUiTone(type) {
  if (!getSoundEnabled() || !getSfxEnabled()) {
    return;
  }

  const nowMs = performance.now();
  if (nowMs - lastUiSoundAt < 34) {
    return;
  }

  const audio = getAudioContext();
  if (!audio) {
    return;
  }

  lastUiSoundAt = nowMs;
  const now = audio.currentTime;
  const volume = Math.max(0.001, getSoundVolume() * (type === "click" ? 0.15 : 0.1));
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const filter = audio.createBiquadFilter();

  osc.type = type === "click" ? "square" : "triangle";
  osc.frequency.setValueAtTime(type === "click" ? 620 : 520, now);
  osc.frequency.exponentialRampToValueAtTime(type === "click" ? 360 : 430, now + 0.045);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(type === "click" ? 620 : 520, now);
  filter.Q.setValueAtTime(type === "click" ? 5 : 3.2, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (type === "click" ? 0.082 : 0.058));

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + (type === "click" ? 0.095 : 0.07));
}

function handleGlobalButtonClick(event) {
  const control = getUiSoundControl(event.target);
  if (!control || control.closest(".merchant-screen") || isPageTransitionControl(control)) {
    return;
  }

  playGlobalClickSound();
}

function getUiSoundControl(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const control = target.closest("button, [role='button'], .menu-action-row, .level-card");
  if (!control || control.disabled || control.getAttribute("aria-disabled") === "true") {
    return null;
  }

  return control;
}

function isPageTransitionControl(control) {
  return Boolean(control.closest(".menu-action-row, .level-card, .settings-back, .pause-action-row"));
}

function playMusicStep() {
  const audio = getAudioContext();
  if (!audio || !musicGain || !getSoundEnabled()) {
    stopGlobalMusic();
    return;
  }

  updateGlobalMusicVolume();
  const now = audio.currentTime;
  const bass = [82.41, 82.41, 110, 98, 73.42, 73.42, 98, 110];
  const lead = [329.63, 0, 392, 440, 493.88, 0, 440, 392];
  const step = musicStep % bass.length;
  playMusicNote(bass[step], 0.32, 0.18, "triangle", now);
  playMusicNote(bass[step] * 2, 0.2, 0.055, "sawtooth", now + 0.02);
  if (lead[step]) {
    playMusicNote(lead[step], 0.2, 0.11, "square", now + 0.03);
  }
  musicStep += 1;
}

function playMusicNote(frequency, duration, gainValue, wave, startTime) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}
