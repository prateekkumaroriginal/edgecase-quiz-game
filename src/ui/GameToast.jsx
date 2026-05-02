import React, { useEffect, useState } from "react";

export function GameToast({ toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast?.message) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    const hideTimer = window.setTimeout(() => setVisible(false), 1400);
    return () => window.clearTimeout(hideTimer);
  }, [toast]);

  if (!toast?.message || !visible) {
    return null;
  }

  return (
    <div className="game-toast pointer-events-none absolute left-1/2 top-[84px] z-[7] -translate-x-1/2">
      {toast.message}
    </div>
  );
}
