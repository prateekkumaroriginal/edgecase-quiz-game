import { useEffect, useRef } from "react";
import { playGlobalNavSound } from "../game/audio.js";

export function useFocusSound(focusKey) {
  const readyRef = useRef(false);

  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }

    if (focusKey === null || focusKey === undefined) {
      return;
    }

    playGlobalNavSound();
  }, [focusKey]);
}
