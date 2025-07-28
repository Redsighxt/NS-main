import React from "react";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { InfoPanelContent } from "./InfoPanelContent";
import { Info } from "lucide-react";

export function InfoPanel() {
  return (
    <AnimatedFloatingPanel
      id="info-panel"
      title="Information & Shortcuts"
      icon={Info}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 400 : 950,
        y: 200,
      }}
      defaultSize={{ width: 400, height: 600 }}
    >
      <InfoPanelContent />
    </AnimatedFloatingPanel>
  );
}
