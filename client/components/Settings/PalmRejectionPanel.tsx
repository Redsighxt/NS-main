import React from "react";
import { FloatingPanel } from "../FloatingPanel/FloatingPanel";
import { Hand, Settings2, Zap, Shield, Target, Timer, Pen } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";
import { cn } from "../../lib/utils";
import { useStylusOnly } from "../../contexts/StylusOnlyContext";

interface PalmRejectionSettings {
  enabled: boolean;
  sensitivity: number;
  timeout: number;
  mode: "conservative" | "balanced" | "aggressive";
  touchSize: number;
  stylusOnly: boolean;
  delayBeforeActivation: number;
  edgeRejection: boolean;
}

export function PalmRejectionPanel() {
  const { state: stylusState, setMode } = useStylusOnly();
  const [settings, setSettings] = React.useState<PalmRejectionSettings>({
    enabled: true,
    sensitivity: 7,
    timeout: 300,
    mode: "balanced",
    touchSize: 15,
    stylusOnly: false,
    delayBeforeActivation: 50,
    edgeRejection: true,
  });

  const updateSetting = <K extends keyof PalmRejectionSettings>(
    key: K,
    value: PalmRejectionSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Store in localStorage for persistence
    localStorage.setItem(
      "palmRejectionSettings",
      JSON.stringify({ ...settings, [key]: value }),
    );
  };

  // Load settings from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem("palmRejectionSettings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      } catch (error) {
        console.warn(
          "Failed to parse palm rejection settings from localStorage",
        );
      }
    }
  }, []);

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case "conservative":
        return "Less sensitive - May allow some palm touches through";
      case "balanced":
        return "Good balance between palm rejection and drawing sensitivity";
      case "aggressive":
        return "Most sensitive - May reject some valid touches";
      default:
        return "";
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "conservative":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "balanced":
        return <Target className="h-4 w-4 text-green-500" />;
      case "aggressive":
        return <Zap className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <FloatingPanel
      id="palm-rejection"
      title="Palm Rejection"
      icon={Hand}
      defaultPosition={{ x: 50, y: 50 }}
      defaultSize={{ width: 380, height: 700 }}
      className="max-h-[90vh]"
      hideCloseButton={true}
      defaultOpen={false}
      defaultMinimized={true}
    >
      <div className="space-y-6">
        {/* Stylus Modes - Top Priority */}
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Pen className="h-4 w-4 text-orange-500" />
              Stylus Input Modes
            </CardTitle>
            <CardDescription className="text-xs">
              Control how the app responds to different input types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              {/* Normal Mode */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="stylus-off"
                  name="stylus-mode"
                  checked={stylusState.mode === "off"}
                  onChange={() => setMode("off")}
                  className="text-orange-500 focus:ring-orange-500"
                />
                <Label htmlFor="stylus-off" className="text-xs font-medium">
                  Normal Mode
                </Label>
                <div className="text-xs text-muted-foreground ml-auto">
                  Accept all input types
                </div>
              </div>

              {/* Light Stylus Mode */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="stylus-light"
                  name="stylus-mode"
                  checked={stylusState.mode === "light"}
                  onChange={() => setMode("light")}
                  className="text-orange-500 focus:ring-orange-500"
                />
                <Label htmlFor="stylus-light" className="text-xs font-medium">
                  Light Stylus Only
                </Label>
                <div className="text-xs text-muted-foreground ml-auto">
                  Canvas stylus-only, UI accepts fingers
                </div>
              </div>

              {/* Full Stylus Mode */}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="stylus-full"
                  name="stylus-mode"
                  checked={stylusState.mode === "full"}
                  onChange={() => setMode("full")}
                  className="text-orange-500 focus:ring-orange-500"
                />
                <Label htmlFor="stylus-full" className="text-xs font-medium">
                  Full Stylus Only
                </Label>
                <div className="text-xs text-muted-foreground ml-auto">
                  Everything stylus-only except stylus icon
                </div>
              </div>
            </div>

            {stylusState.mode !== "off" && (
              <div
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg",
                  stylusState.mode === "light"
                    ? "bg-orange-100 dark:bg-orange-900/20"
                    : "bg-orange-200 dark:bg-orange-800/30",
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
                    stylusState.mode === "light"
                      ? "bg-orange-400"
                      : "bg-orange-500",
                  )}
                />
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {stylusState.mode === "light"
                    ? "Light stylus mode: Canvas accepts only stylus, UI accepts fingers."
                    : "Full stylus mode: Only stylus input accepted everywhere (except stylus icon)."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Palm Rejection Status - Show if disabled by stylus mode */}
        {(stylusState.mode === "light" || stylusState.mode === "full") && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Palm rejection is automatically disabled when using stylus
                  modes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Master Enable/Disable */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  Palm Rejection
                </CardTitle>
                <CardDescription className="text-xs">
                  Prevent palm touches from interfering with Apple Pencil
                  drawing
                </CardDescription>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting("enabled", checked)}
                disabled={
                  stylusState.mode === "light" || stylusState.mode === "full"
                }
              />
            </div>
          </CardHeader>
        </Card>

        {settings.enabled && stylusState.mode === "off" && (
          <>
            {/* Mode Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Detection Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={settings.mode}
                  onValueChange={(
                    value: "conservative" | "balanced" | "aggressive",
                  ) => updateSetting("mode", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Conservative
                      </div>
                    </SelectItem>
                    <SelectItem value="balanced">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        Balanced
                      </div>
                    </SelectItem>
                    <SelectItem value="aggressive">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        Aggressive
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                  {getModeIcon(settings.mode)}
                  <p className="text-xs text-muted-foreground">
                    {getModeDescription(settings.mode)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sensitivity Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Sensitivity
                </CardTitle>
                <CardDescription className="text-xs">
                  How aggressively to reject palm touches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">
                      Palm Detection Sensitivity
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {settings.sensitivity}/10
                    </span>
                  </div>
                  <Slider
                    value={[settings.sensitivity]}
                    onValueChange={(value) =>
                      updateSetting("sensitivity", value[0])
                    }
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Less sensitive</span>
                    <span>More sensitive</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Touch Size Threshold</Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {settings.touchSize}px
                    </span>
                  </div>
                  <Slider
                    value={[settings.touchSize]}
                    onValueChange={(value) =>
                      updateSetting("touchSize", value[0])
                    }
                    max={30}
                    min={5}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Larger touches are more likely to be rejected as palm
                    touches
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Timing Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Palm Rejection Timeout</Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {settings.timeout}ms
                    </span>
                  </div>
                  <Slider
                    value={[settings.timeout]}
                    onValueChange={(value) =>
                      updateSetting("timeout", value[0])
                    }
                    max={1000}
                    min={100}
                    step={50}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to ignore touches after palm is detected
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Activation Delay</Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {settings.delayBeforeActivation}ms
                    </span>
                  </div>
                  <Slider
                    value={[settings.delayBeforeActivation]}
                    onValueChange={(value) =>
                      updateSetting("delayBeforeActivation", value[0])
                    }
                    max={200}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Delay before palm rejection activates after stylus use
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Advanced Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-xs">Edge Rejection</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically reject touches near screen edges
                    </p>
                  </div>
                  <Switch
                    checked={settings.edgeRejection}
                    onCheckedChange={(checked) =>
                      updateSetting("edgeRejection", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status Info */}
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Palm rejection is active and optimized for Apple Pencil
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </FloatingPanel>
  );
}
