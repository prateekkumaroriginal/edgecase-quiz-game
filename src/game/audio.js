import { getMusicVolume, getSoundEnabled } from "./settings.js";

let audioContext = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;

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
