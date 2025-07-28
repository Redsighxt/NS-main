import React, { useState } from "react";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Settings, Palette, RotateCcw, Plus, Trash2 } from "lucide-react";

export function SettingsPanel() {
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("#ff0000");

  const handleAddCustomColor = () => {
    if (newColor && !customColors.includes(newColor)) {
      setCustomColors([...customColors, newColor]);
    }
  };

  const handleRemoveCustomColor = (color: string) => {
    setCustomColors(customColors.filter((c) => c !== color));
  };

  const handleRestoreDefaults = () => {
    setCustomColors([]);
    // Reset to default color presets
    const defaultColors = [
      "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
      "#ffff00", "#ff00ff", "#00ffff", "#ffa500", "#800080"
    ];

    // Update drawing state with default colors if needed
    try {
      localStorage.removeItem("custom-colors");
      console.log("Restored default color presets");
    } catch (error) {
      console.warn("Failed to clear custom colors from storage:", error);
    }
  };

  return (
    <AnimatedFloatingPanel
      id="settings"
      title="Settings"
      icon={Settings}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 340 : 800,
        y: 80,
      }}
      defaultSize={{ width: 320, height: 500 }}
    >
      <div className="space-y-6">
        {/* Color Preset Management */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <Label className="text-sm font-semibold">
              Color Preset Management
            </Label>
          </div>

          {/* Add Custom Color */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Add Custom Color
            </Label>
            <div className="flex space-x-2">
              <Input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-12 h-8 p-1 rounded cursor-pointer"
              />
              <Input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="flex-1 font-mono text-xs"
                placeholder="#ff0000"
              />
              <Button size="sm" onClick={handleAddCustomColor} className="px-2">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Custom Colors List */}
          {customColors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Custom Colors
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {customColors.map((color) => (
                  <div key={color} className="relative group">
                    <div
                      className="w-8 h-8 rounded border-2 border-border"
                      style={{ backgroundColor: color }}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-1 -right-1 w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveCustomColor(color)}
                    >
                      <Trash2 className="h-2 w-2" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Restore Defaults */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Reset Presets
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreDefaults}
              className="w-full flex items-center space-x-2"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restore Default Presets</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Animation Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Animation Settings</Label>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Shape Fill Animation
            </Label>
            <div className="text-xs text-muted-foreground">
              ✓ Enabled - Shape fills will animate in replay mode
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Line Style Animation
            </Label>
            <div className="text-xs text-muted-foreground">
              ✓ Enabled - Dashed and dotted lines will animate
            </div>
          </div>
        </div>

        <Separator />

        {/* Canvas Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Canvas Settings</Label>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Content Navigation
            </Label>
            <div className="text-xs text-muted-foreground">
              ✓ "Go Back to Content" button appears when far from drawings
            </div>
          </div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
