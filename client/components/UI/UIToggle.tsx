import React from "react";
import { Button } from "../ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useUIVisibility } from "../../contexts/UIVisibilityContext";

export function UIToggle() {
  const { isUIVisible, toggleUI } = useUIVisibility();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleUI}
      className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 transition-all"
      title={isUIVisible ? "Hide UI" : "Show UI"}
    >
      {isUIVisible ? (
        <Eye className="h-4 w-4" />
      ) : (
        <EyeOff className="h-4 w-4" />
      )}
    </Button>
  );
}
