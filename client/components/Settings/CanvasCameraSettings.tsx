import React, { useState } from "react";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useVirtualPages } from "../../contexts/VirtualPagesContext";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { cn } from "../../lib/utils";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Trash2, Play, Square, Settings2 } from "lucide-react";

export function CanvasCameraSettings() {
  const { state, dispatch } = useCanvasSettings();
  const virtualPages = useVirtualPages();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCanvasModeChange = (mode: "infinite" | "page") => {
    dispatch({ type: "SET_CANVAS_MODE", mode });
  };

  const handleCameraTrackingModeChange = (
    mode: "off" | "automatic" | "manual",
  ) => {
    dispatch({ type: "SET_CAMERA_TRACKING_MODE", mode });
  };

  const handleStartCameraPath = () => {
    dispatch({ type: "START_CREATING_CAMERA_PATH" });
  };

  const handleStopCameraPath = () => {
    dispatch({ type: "STOP_CREATING_CAMERA_PATH" });
  };

  const handleClearCameraPath = () => {
    dispatch({ type: "CLEAR_CAMERA_PATH" });
  };

  const handleSmoothingChange = (value: number[]) => {
    dispatch({ type: "SET_AUTO_TRACKING_SMOOTHING", smoothing: value[0] });
  };

  return (
    <div className="space-y-6">
      {/* Canvas Mode Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Canvas Mode</CardTitle>
          <CardDescription>
            Switch between infinite canvas and fixed page size
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="canvas-mode">Mode</Label>
            <Select
              value={state.canvasMode}
              onValueChange={handleCanvasModeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="infinite">Infinite Canvas</SelectItem>
                <SelectItem value="page">Page Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state.canvasMode === "page" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Page Size
                </Label>
                <div className="text-sm">
                  {state.pageSize.width} × {state.pageSize.height} px
                </div>
              </div>

              {/* Ruled Lines for Page Mode */}
              <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Ruled Lines</Label>
                  <Switch
                    checked={state.showRuledLines}
                    onCheckedChange={(checked) =>
                      dispatch({ type: "TOGGLE_RULED_LINES", show: checked })
                    }
                  />
                </div>

                {state.showRuledLines && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Line Spacing: {state.ruledLineSpacing}px
                      </Label>
                      <Slider
                        value={[state.ruledLineSpacing]}
                        onValueChange={(value) =>
                          dispatch({
                            type: "SET_RULED_LINE_SPACING",
                            spacing: value[0],
                          })
                        }
                        min={16}
                        max={40}
                        step={2}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Color</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          "#d1d5db", // Light grey (default)
                          "#94a3b8", // Slate 400
                          "#6b7280", // Gray 500
                          "#3f3f46", // Zinc 700
                          "#1f2937", // Gray 800
                          "#3b82f6", // Blue 500
                          "#10b981", // Emerald 500
                          "#f59e0b", // Amber 500
                          "#ef4444", // Red 500
                          "#8b5cf6", // Violet 500
                        ].map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                              state.ruledLineColor === color
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() =>
                              dispatch({
                                type: "SET_RULED_LINE_COLOR",
                                color,
                              })
                            }
                            title={`Set ruled lines color to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Margin Settings for Page Mode */}
              <div className="space-y-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Side Margin</Label>
                  <Switch
                    checked={state.showMargins}
                    onCheckedChange={(checked) =>
                      dispatch({ type: "TOGGLE_MARGINS", show: checked })
                    }
                  />
                </div>

                {state.showMargins && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Position: {state.marginPosition}% from left
                      </Label>
                      <Slider
                        value={[state.marginPosition]}
                        onValueChange={(value) =>
                          dispatch({
                            type: "SET_MARGIN_POSITION",
                            position: value[0],
                          })
                        }
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Line Style</Label>
                      <div className="flex space-x-2">
                        {[
                          { value: "solid", label: "Solid" },
                          { value: "dashed", label: "Dashed" },
                          { value: "dotted", label: "Dotted" },
                        ].map((style) => (
                          <Button
                            key={style.value}
                            variant={
                              state.marginStyle === style.value
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              dispatch({
                                type: "SET_MARGIN_STYLE",
                                style: style.value as
                                  | "solid"
                                  | "dashed"
                                  | "dotted",
                              })
                            }
                            className="flex-1 text-xs"
                          >
                            {style.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Color</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          "#d1d5db", // Light grey (default)
                          "#94a3b8", // Slate 400
                          "#6b7280", // Gray 500
                          "#3f3f46", // Zinc 700
                          "#1f2937", // Gray 800
                          "#3b82f6", // Blue 500
                          "#10b981", // Emerald 500
                          "#f59e0b", // Amber 500
                          "#ef4444", // Red 500
                          "#8b5cf6", // Violet 500
                        ].map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                              state.marginColor === color
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() =>
                              dispatch({
                                type: "SET_MARGIN_COLOR",
                                color,
                              })
                            }
                            title={`Set margin color to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Virtual Pages Statistics for Infinite Mode */}
          {state.canvasMode === "infinite" &&
            virtualPages.statistics.totalPages > 1 && (
              <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Virtual Pages</Label>
                  <Badge variant="outline">
                    {virtualPages.statistics.pagesWithElements}/
                    {virtualPages.statistics.totalPages}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Pages with content:
                    </span>
                    <span className="font-medium">
                      {virtualPages.statistics.pagesWithElements}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total elements:
                    </span>
                    <span className="font-medium">
                      {virtualPages.statistics.totalElements}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Origin page elements:
                    </span>
                    <span className="font-medium">
                      {virtualPages.statistics.originPageElements}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => virtualPages.refresh()}
                  className="w-full"
                >
                  Refresh Pages
                </Button>
              </div>
            )}

          {/* Grid Settings for Infinite Mode */}
          {state.canvasMode === "infinite" && (
            <div className="space-y-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Grid</Label>
                <Switch
                  checked={state.showGrid}
                  onCheckedChange={(checked) =>
                    dispatch({ type: "TOGGLE_GRID", show: checked })
                  }
                />
              </div>

              {state.showGrid && (
                <div className="space-y-2">
                  <Label className="text-xs">
                    Grid Size: {state.gridSize}px
                  </Label>
                  <Slider
                    value={[state.gridSize]}
                    onValueChange={(value) =>
                      dispatch({ type: "SET_GRID_SIZE", size: value[0] })
                    }
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* Ruled Lines Settings for Infinite Mode */}
          {state.canvasMode === "infinite" && (
            <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Ruled Lines</Label>
                <Switch
                  checked={state.showRuledLines}
                  onCheckedChange={(checked) =>
                    dispatch({ type: "TOGGLE_RULED_LINES", show: checked })
                  }
                />
              </div>

              {state.showRuledLines && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Line Density: {state.ruledLineSpacing}px
                    </Label>
                    <Slider
                      value={[state.ruledLineSpacing]}
                      onValueChange={(value) =>
                        dispatch({
                          type: "SET_RULED_LINE_SPACING",
                          spacing: value[0],
                        })
                      }
                      min={12}
                      max={60}
                      step={2}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Color Presets</Label>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        "#d1d5db", // Light grey
                        "#64748b", // Slate
                        "#6b7280", // Gray
                        "#71717a", // Zinc
                        "#374151", // Dark gray
                        "#3b82f6", // Blue
                        "#10b981", // Emerald
                        "#f59e0b", // Amber
                        "#ef4444", // Red
                        "#8b5cf6", // Violet
                      ].map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-6 h-6 rounded border-2 hover:scale-110 transition-transform",
                            state.ruledLineColor === color
                              ? "border-gray-900 dark:border-gray-100"
                              : "border-gray-300 dark:border-gray-600",
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            dispatch({ type: "SET_RULED_LINE_COLOR", color })
                          }
                          title={`Set ruled line color to ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Origin Box Settings for Infinite Mode */}
          {state.canvasMode === "infinite" && (
            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Origin Box (1920×1080)
                </Label>
                <Switch
                  checked={state.originBox.visible}
                  onCheckedChange={(checked) =>
                    dispatch({ type: "TOGGLE_ORIGIN_BOX", show: checked })
                  }
                />
              </div>

              {state.originBox.visible && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Full HD reference frame for animation recording
                  </div>

                  {/* Style Settings */}
                  <div className="space-y-2">
                    <Label className="text-xs">Border Style</Label>
                    <Select
                      value={state.originBox.style.strokeStyle}
                      onValueChange={(value) =>
                        dispatch({
                          type: "SET_ORIGIN_BOX_STYLE",
                          style: {
                            strokeStyle: value as "solid" | "dashed" | "dotted",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">
                      Opacity: {Math.round(state.originBox.style.opacity * 100)}
                      %
                    </Label>
                    <Slider
                      value={[state.originBox.style.opacity]}
                      onValueChange={(value) =>
                        dispatch({
                          type: "SET_ORIGIN_BOX_STYLE",
                          style: { opacity: value[0] },
                        })
                      }
                      min={0.1}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Tracking Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Camera Tracking</CardTitle>
          <CardDescription>
            Control how the camera follows your drawing during recording
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="camera-mode">Tracking Mode</Label>
            <Select
              value={state.cameraTrackingMode}
              onValueChange={handleCameraTrackingModeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="manual">Manual Path</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Automatic Mode Settings */}
          {state.cameraTrackingMode === "automatic" && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Smoothing</Label>
                <div className="px-2">
                  <Slider
                    value={[state.autoTrackingSmoothing]}
                    onValueChange={handleSmoothingChange}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Responsive</span>
                  <span>{Math.round(state.autoTrackingSmoothing * 100)}%</span>
                  <span>Smooth</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Camera automatically follows your drawing with smooth movements
              </div>
            </div>
          )}

          {/* Manual Mode Settings */}
          {state.cameraTrackingMode === "manual" && (
            <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Camera Path</Label>
                <Badge
                  variant={state.isCreatingCameraPath ? "default" : "secondary"}
                >
                  {state.isCreatingCameraPath ? "Creating" : "Ready"}
                </Badge>
              </div>

              <div className="flex gap-2">
                {!state.isCreatingCameraPath ? (
                  <Button
                    onClick={handleStartCameraPath}
                    size="sm"
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Path
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopCameraPath}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Path
                  </Button>
                )}

                {state.cameraPath && (
                  <Button
                    onClick={handleClearCameraPath}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {state.cameraPath && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Keyframes: {state.cameraPath.keyframes.length}
                  </Label>
                  {state.cameraPath.keyframes.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {state.cameraPath.keyframes.map((keyframe, index) => (
                        <div key={keyframe.id} className="flex justify-between">
                          <span>Point {index + 1}</span>
                          <span>{keyframe.timestamp}s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {state.isCreatingCameraPath && (
                <div className="text-sm text-muted-foreground p-3 bg-white/50 dark:bg-black/20 rounded border">
                  <strong>Instructions:</strong>
                  <br />
                  Hold{" "}
                  <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                    Ctrl
                  </kbd>{" "}
                  + Click on canvas to add keyframes
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Advanced Settings</Label>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
            </div>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Current Camera Position
                  </Label>
                  <div className="text-xs font-mono space-y-1">
                    <div>X: {Math.round(state.currentCameraPosition.x)}</div>
                    <div>Y: {Math.round(state.currentCameraPosition.y)}</div>
                    <div>
                      Scale: {state.currentCameraPosition.scale.toFixed(2)}x
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong>Infinite Canvas:</strong> Unlimited drawing space with pan
            and zoom
          </div>
          <div>
            <strong>Page Mode:</strong> Fixed canvas size matching your screen
          </div>
          <div>
            <strong>Origin Box:</strong> 1920×1080 reference frame for animation
            recording (infinite canvas only)
          </div>
          <div>
            <strong>Auto Tracking:</strong> Camera smoothly follows your brush
            while recording
          </div>
          <div>
            <strong>Manual Path:</strong> Create custom camera movements with
            timed keyframes
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
