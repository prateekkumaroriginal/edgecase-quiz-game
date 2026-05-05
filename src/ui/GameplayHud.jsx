import React from "react";

export function GameplayHud({ hud }) {
  if (!hud) {
    return null;
  }

  return (
    <div className="gameplay-hud pointer-events-none absolute inset-x-0 top-0 z-[4] font-['Cascadia_Mono',Consolas,monospace] text-[16px] font-extrabold text-[#edf8ed]">
      <div className="hud-cluster hud-cluster--left">
        <div className="hud-pill hud-pill--coins">
          <span className="hud-coin" aria-hidden="true" />
          <span>{hud.coins}</span>
        </div>
        <div className="hud-health" aria-label={`Health ${hud.health} of ${hud.maxHealth}`}>
          {Array.from({ length: hud.maxHealth }, (_, index) => (
            <span
              key={index}
              className={index < hud.health ? "hud-health__cell hud-health__cell--full" : "hud-health__cell"}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
      <div className="hud-cluster hud-cluster--center">
        <div className="hud-status">{hud.status}</div>
      </div>
      {hud.prompt ? (
        <div className="hud-cluster hud-cluster--right">
          <div className="hud-prompt">{hud.prompt}</div>
        </div>
      ) : null}
    </div>
  );
}
