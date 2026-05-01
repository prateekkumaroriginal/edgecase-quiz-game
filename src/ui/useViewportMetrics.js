import { useEffect, useState } from "react";

const REFERENCE_WIDTH = 1280;
const REFERENCE_HEIGHT = 720;
const REFERENCE_ASPECT = REFERENCE_WIDTH / REFERENCE_HEIGHT;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getViewportSize() {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width || window.innerWidth || REFERENCE_WIDTH,
    height: viewport?.height || window.innerHeight || REFERENCE_HEIGHT
  };
}

function getViewportMetrics() {
  const { width, height } = getViewportSize();
  const aspect = width / height;
  const safeWidth = aspect > REFERENCE_ASPECT ? height * REFERENCE_ASPECT : width;
  const safeHeight = aspect > REFERENCE_ASPECT ? height : width / REFERENCE_ASPECT;
  const safeX = (width - safeWidth) / 2;
  const safeY = (height - safeHeight) / 2;
  const referenceScale = Math.min(safeWidth / REFERENCE_WIDTH, safeHeight / REFERENCE_HEIGHT);

  return {
    width,
    height,
    aspect,
    safeWidth,
    safeHeight,
    safeX,
    safeY,
    uiScale: clamp(referenceScale, 0.72, 1.16),
    orientation: width >= height ? "landscape" : "portrait",
    devicePixelRatio: window.devicePixelRatio || 1
  };
}

export function useViewportMetrics() {
  const [metrics, setMetrics] = useState(() => getViewportMetrics());

  useEffect(() => {
    function syncMetrics() {
      setMetrics(getViewportMetrics());
    }

    window.addEventListener("resize", syncMetrics);
    window.addEventListener("orientationchange", syncMetrics);
    document.addEventListener("fullscreenchange", syncMetrics);
    window.visualViewport?.addEventListener("resize", syncMetrics);
    syncMetrics();

    return () => {
      window.removeEventListener("resize", syncMetrics);
      window.removeEventListener("orientationchange", syncMetrics);
      document.removeEventListener("fullscreenchange", syncMetrics);
      window.visualViewport?.removeEventListener("resize", syncMetrics);
    };
  }, []);

  return metrics;
}

export function getViewportStyleVars(metrics) {
  const safePadX = Math.max(24, metrics.safeX + 44 * metrics.uiScale);
  const safePadY = Math.max(24, metrics.safeY + 34 * metrics.uiScale);
  const safeContentWidth = Math.min(1220, Math.max(0, metrics.width - safePadX * 2));

  return {
    "--viewport-width": `${metrics.width}px`,
    "--viewport-height": `${metrics.height}px`,
    "--viewport-aspect": metrics.aspect,
    "--safe-x": `${metrics.safeX}px`,
    "--safe-y": `${metrics.safeY}px`,
    "--safe-width": `${metrics.safeWidth}px`,
    "--safe-height": `${metrics.safeHeight}px`,
    "--ui-scale": metrics.uiScale,
    "--device-pixel-ratio": metrics.devicePixelRatio,
    "--safe-pad-x": `${safePadX}px`,
    "--safe-pad-y": `${safePadY}px`,
    "--safe-content-width": `${safeContentWidth}px`,
    "--page-title-size": `${clamp(metrics.width * 0.068, 62, 104)}px`,
    "--panel-row-height": `${clamp(140 * metrics.uiScale, 112, 140)}px`,
    "--panel-gap": `${clamp(20 * metrics.uiScale, 14, 20)}px`,
    "--settings-subtitle-size": `${clamp(30 * metrics.uiScale, 21, 30)}px`,
    "--settings-subtitle-margin-top": `${clamp(30 * metrics.uiScale, 18, 30)}px`,
    "--settings-back-height": `${clamp(62 * metrics.uiScale, 54, 62)}px`,
    "--settings-back-pad-x": `${clamp(32 * metrics.uiScale, 22, 32)}px`,
    "--settings-back-font-size": "30px",
    "--settings-row-icon-size": `${clamp(58 * metrics.uiScale, 44, 58)}px`,
    "--settings-row-heading-size": `${clamp(30 * metrics.uiScale, 23, 30)}px`,
    "--settings-row-copy-size": `${clamp(16 * metrics.uiScale, 14, 16)}px`,
    "--settings-row-pad-y": `${clamp(22 * metrics.uiScale, 16, 22)}px`,
    "--settings-row-pad-x": `${clamp(48 * metrics.uiScale, 24, 48)}px`,
    "--settings-row-pad-left": `${clamp(56 * metrics.uiScale, 28, 56)}px`,
    "--settings-percent-size": `${clamp(27 * metrics.uiScale, 22, 27)}px`,
    "--settings-mode-height": `${clamp(78 * metrics.uiScale, 62, 78)}px`,
    "--settings-mode-font-size": `${clamp(31 * metrics.uiScale, 23, 31)}px`,
    "--settings-list-margin-top": `${clamp(50 * metrics.uiScale, 28, 50)}px`,
    "--settings-list-margin-left": `${Math.min(42, 42 * metrics.uiScale)}px`,
    "--menu-list-margin-top": `${clamp(72 * metrics.uiScale, 42, 72)}px`,
    "--menu-list-margin-left": `${Math.min(42, 42 * metrics.uiScale)}px`,
    "--menu-row-height": `${clamp(140 * metrics.uiScale, 108, 140)}px`,
    "--menu-row-icon-column": `${clamp(126 * metrics.uiScale, 70, 126)}px`,
    "--menu-row-min-copy": `${clamp(360 * metrics.uiScale, 210, 360)}px`,
    "--menu-row-pad-y": `${clamp(22 * metrics.uiScale, 16, 22)}px`,
    "--menu-row-pad-right": `${clamp(48 * metrics.uiScale, 24, 48)}px`,
    "--menu-row-pad-left": `${clamp(56 * metrics.uiScale, 28, 56)}px`,
    "--menu-row-title-size": `${clamp(30 * metrics.uiScale, 23, 30)}px`,
    "--menu-row-copy-size": `${clamp(16 * metrics.uiScale, 14, 16)}px`,
    "--menu-icon-size": `${clamp(58 * metrics.uiScale, 44, 58)}px`
  };
}
