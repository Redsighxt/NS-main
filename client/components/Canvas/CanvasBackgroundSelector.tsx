import React, { useState } from "react";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Palette, Plus, X } from "lucide-react";
import { cn } from "../../lib/utils";

export function CanvasBackgroundSelector() {
  const {
    currentBackground,
    backgrounds,
    customBackgrounds,
    setBackground,
    addCustomBackground,
    removeCustomBackground,
  } = useCanvasBackground();

  const [customColor, setCustomColor] = useState("#f0f0f0");
  const [customName, setCustomName] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  return (
    <AnimatedFloatingPanel
      id="canvas-background"
      title="Canvas Background"
      icon={Palette}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 360 : 900,
        y: 400,
      }}
      defaultSize={{ width: 360, height: 500 }}
    >
      <div className="space-y-6">
        {/* Preset Backgrounds */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Preset Backgrounds
          </div>

          <div className="grid grid-cols-3 gap-3">
            {backgrounds.map((background) => {
              const isSelected = currentBackground.id === background.id;

              return (
                <Button
                  key={background.id}
                  variant="ghost"
                  onClick={() => setBackground(background)}
                  className={cn(
                    "h-16 w-full p-3 border-2 transition-all duration-200",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border hover:border-muted-foreground hover:scale-102",
                  )}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-md border relative overflow-hidden",
                        background.color === "transparent"
                          ? "border-dashed border-muted-foreground"
                          : "border-border",
                      )}
                      style={{
                        backgroundColor:
                          background.color === "transparent"
                            ? "#ffffff"
                            : background.color,
                      }}
                    >
                      {/* Checkerboard pattern for transparent backgrounds */}
                      {background.color === "transparent" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `
                              linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                              linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                              linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                              linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                            `,
                            backgroundSize: "8px 8px",
                            backgroundPosition:
                              "0 0, 0 4px, 4px -4px, -4px 0px",
                          }}
                        />
                      )}

                      {/* Pattern overlays */}
                      {background.pattern === "dots" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle, rgba(148, 163, 184, 0.6) 1px, transparent 1px)",
                            backgroundSize: "6px 6px",
                          }}
                        />
                      )}
                      {background.pattern === "grid" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `
                              linear-gradient(rgba(148, 163, 184, 0.4) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(148, 163, 184, 0.4) 1px, transparent 1px)
                            `,
                            backgroundSize: "6px 6px",
                          }}
                        />
                      )}
                      {background.pattern === "lines" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, rgba(148, 163, 184, 0.4) 1px, transparent 1px)",
                            backgroundSize: "6px 6px",
                          }}
                        />
                      )}
                    </div>
                    <div className="text-xs text-center font-medium">
                      {background.name}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Custom Backgrounds */}
        {customBackgrounds.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Custom Backgrounds
            </div>

            <div className="grid grid-cols-3 gap-3">
              {customBackgrounds.map((background) => {
                const isSelected = currentBackground.id === background.id;

                return (
                  <div key={background.id} className="relative group">
                    <Button
                      variant="ghost"
                      onClick={() => setBackground(background)}
                      className={cn(
                        "h-16 w-full p-3 border-2 transition-all duration-200",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 scale-105"
                          : "border-border hover:border-muted-foreground hover:scale-102",
                      )}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className="w-8 h-8 rounded-md border border-border"
                          style={{ backgroundColor: background.color }}
                        />
                        <div className="text-xs text-center font-medium">
                          {background.name}
                        </div>
                      </div>
                    </Button>

                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomBackground(background.id);
                      }}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Custom Color */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Add Custom Background
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomForm(!showCustomForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Color
            </Button>
          </div>

          {showCustomForm && (
            <div className="space-y-3 p-3 bg-muted/20 rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <Label className="text-xs">Color</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-12 h-8 p-1 border-0"
                    />
                    <Input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="flex-1 text-xs font-mono"
                      placeholder="#f0f0f0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Custom background name..."
                  className="mt-1 text-sm"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={() => {
                    addCustomBackground(customColor, customName || undefined);
                    setCustomName("");
                    setShowCustomForm(false);
                  }}
                  className="flex-1"
                >
                  Add Background
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomForm(false);
                    setCustomName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Current Background Info */}
        <div className="pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Current:{" "}
            <span className="font-medium">{currentBackground.name}</span>
          </div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
