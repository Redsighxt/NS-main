import React from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { TextToolProperties } from "./TextToolProperties";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Palette,
  Settings,
  Brush,
  Trash2,
  Type,
  Eraser,
  Target,
  MousePointer,
  Layers,
} from "lucide-react";
import { SLOPPINESS_PRESETS } from "../../lib/strokeRenderer";
import { cn } from "../../lib/utils";

const colorPresets = [
  // Excalidraw-style outline colors
  "transparent",
  "#1e1e1e",
  "#ffffff",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#ae3ec9",
  "#00a8cc",
  "#fa5252",
  "#51cf66",
  "#339af0",
  "#ff8cc8",
  "#74c0fc",
  "#8ce99a",
  "#ffd43b",
  "#495057",
  "#868e96",
  "#ced4da",
  "#f1f3f4",
];

const fillColorPresets = [
  "transparent",
  "#ffffff",
  "#f8f9fa",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#ae3ec9",
  "#00a8cc",
  "#fa5252",
  "#51cf66",
  "#339af0",
  "#ff8cc8",
  "#74c0fc",
  "#8ce99a",
  "#ffd43b",
  "#495057",
  "#1e1e1e",
];

const highlighterColorPresets = [
  "#ffff00", // Classic yellow
  "#ffeb3b", // Bright yellow
  "#ffc107", // Amber
  "#ff9800", // Orange
  "#ff5722", // Deep orange
  "#e91e63", // Pink
  "#9c27b0", // Purple
  "#673ab7", // Deep purple
  "#3f51b5", // Indigo
  "#2196f3", // Blue
  "#03a9f4", // Light blue
  "#00bcd4", // Cyan
  "#009688", // Teal
  "#4caf50", // Green
  "#8bc34a", // Light green
  "#cddc39", // Lime
  "#ffcc80", // Peach
  "#f8bbd9", // Light pink
  "#e1bee7", // Light purple
  "#c5cae9", // Light indigo
];

export function PropertiesPanel() {
  // Updated color boxes to w-6 h-6 with rounded-lg
  const { state, dispatch } = useDrawing();

  const handleBrushColorChange = (color: string) => {
    dispatch({ type: "SET_BRUSH_COLOR", color });
  };

  const handleBrushSizeChange = (value: number[]) => {
    dispatch({ type: "SET_BRUSH_SIZE", size: value[0] });
  };

  const handleFillColorChange = (color: string) => {
    dispatch({ type: "SET_FILL_COLOR", color });
  };

  return (
    <AnimatedFloatingPanel
      id="properties"
      title="Properties & Settings"
      icon={Settings}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 320 : 800,
        y: 80,
      }}
      defaultSize={{ width: 320, height: 600 }}
    >
      <div className="space-y-6">
        {/* Current Tool Display */}
        <div className="bg-muted/20 rounded-xl p-4 border border-muted/40">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Current Tool
            </Label>
          </div>
          <div className="mt-2 text-xl font-bold capitalize text-foreground">
            {state.currentTool}
          </div>
        </div>

        {/* Highlighter Controls */}
        {state.currentTool === "highlighter" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-yellow-500" />
                <Label className="text-sm font-medium">Highlighter Color</Label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Input
                      type="color"
                      value={state.highlighterColor}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_HIGHLIGHTER_COLOR",
                          color: e.target.value,
                        })
                      }
                      className="w-14 h-10 p-1 border-2 rounded-lg cursor-pointer"
                    />
                    <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-black/10"></div>
                  </div>
                  <Input
                    type="text"
                    value={state.highlighterColor}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_HIGHLIGHTER_COLOR",
                        color: e.target.value,
                      })
                    }
                    className="flex-1 font-mono text-xs uppercase"
                    placeholder="#FFFF00"
                  />
                </div>

                {/* Highlighter Color Presets */}
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Highlighter Palette
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {highlighterColorPresets.map((color) => (
                      <Button
                        key={color}
                        variant="ghost"
                        size="color-box"
                        className={cn(
                          "rounded-md border-2 transition-all duration-200 hover:scale-105",
                          state.highlighterColor === color
                            ? "border-primary ring-2 ring-primary/20 scale-110 shadow-md"
                            : "border-transparent hover:border-muted-foreground/50",
                        )}
                        style={{
                          backgroundColor: color,
                          opacity: 0.7, // Show highlighter opacity in preview
                        }}
                        onClick={() =>
                          dispatch({
                            type: "SET_HIGHLIGHTER_COLOR",
                            color: color,
                          })
                        }
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Opacity: {Math.round(state.highlighterOpacity * 100)}%
              </Label>
              <Slider
                value={[state.highlighterOpacity]}
                onValueChange={(value) =>
                  dispatch({
                    type: "SET_HIGHLIGHTER_OPACITY",
                    opacity: value[0],
                  })
                }
                min={0.1}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Brush Size: {state.brushSize * 3}px (highlighter)
              </Label>
              <Slider
                value={[state.brushSize]}
                onValueChange={(value) =>
                  dispatch({ type: "SET_BRUSH_SIZE", size: value[0] })
                }
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        )}

        {(state.currentTool === "pencil" ||
          state.currentTool === "line" ||
          state.currentTool === "arrow") && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Outline Color</Label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Input
                      type="color"
                      value={state.brushColor}
                      onChange={(e) => handleBrushColorChange(e.target.value)}
                      className="w-14 h-10 p-1 border-2 rounded-lg cursor-pointer"
                    />
                    <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-black/10"></div>
                  </div>
                  <Input
                    type="text"
                    value={state.brushColor}
                    onChange={(e) => handleBrushColorChange(e.target.value)}
                    className="flex-1 font-mono text-xs bg-muted/50"
                    placeholder="#000000"
                  />
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Color Palette
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {colorPresets.map((color) => (
                      <Button
                        key={color}
                        variant="ghost"
                        size="color-box"
                        className={cn(
                          "rounded-md border-2 transition-all duration-200 hover:scale-105 relative",
                          state.brushColor === color
                            ? "border-primary ring-2 ring-primary/20 scale-110 shadow-md"
                            : "border-transparent hover:border-muted-foreground/50",
                        )}
                        style={{
                          backgroundColor:
                            color === "transparent" ? "#fff" : color,
                          backgroundImage:
                            color === "transparent"
                              ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px"
                              : "none",
                        }}
                        onClick={() => handleBrushColorChange(color)}
                        title={color === "transparent" ? "No Outline" : color}
                      >
                        {color === "transparent" && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-red-500 rotate-45"></div>
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-current rounded"></div>
                <span>Stroke Width</span>
              </Label>

              <div className="space-y-3">
                <div className="px-3 py-2 bg-muted/30 rounded-lg">
                  <Slider
                    value={[state.brushSize]}
                    onValueChange={handleBrushSizeChange}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">1px</span>
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                    {state.brushSize}px
                  </div>
                  <span className="text-muted-foreground">20px</span>
                </div>

                {/* Visual stroke preview */}
                <div className="flex items-center justify-center p-3 bg-muted/20 rounded-lg">
                  <div
                    className="rounded-full"
                    style={{
                      width: `${Math.max(state.brushSize, 2)}px`,
                      height: `${Math.max(state.brushSize, 2)}px`,
                      backgroundColor: state.brushColor,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Stroke Style Settings - Only for Line and Arrow tools */}
            {(state.currentTool === "line" ||
              state.currentTool === "arrow") && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center space-x-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-current"></div>
                  <span>Stroke Style</span>
                </Label>

                <div className="space-y-3">
                  {/* Line Type */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "solid", label: "Solid", pattern: "���────" },
                      { value: "dashed", label: "Dashed", pattern: "── ── ──" },
                      { value: "dotted", label: "Dotted", pattern: "·····" },
                    ].map((style) => (
                      <Button
                        key={style.value}
                        variant={
                          state.lineStyle.type === style.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          dispatch({
                            type: "SET_LINE_STYLE_TYPE",
                            lineType: style.value as any,
                          })
                        }
                        className="text-xs py-2 h-auto flex flex-col space-y-1"
                      >
                        <span className="font-mono text-xs">
                          {style.pattern}
                        </span>
                        <span>{style.label}</span>
                      </Button>
                    ))}
                  </div>

                  {/* Line Intensity */}
                  {state.lineStyle.type !== "solid" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Pattern Intensity: {state.lineStyle.intensity}
                      </Label>
                      <div className="px-3 py-2 bg-muted/30 rounded-lg">
                        <Slider
                          value={[state.lineStyle.intensity]}
                          onValueChange={([value]) =>
                            dispatch({
                              type: "SET_LINE_STYLE_INTENSITY",
                              intensity: value,
                            })
                          }
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Line Opacity */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Opacity: {Math.round(state.lineStyle.opacity * 100)}%
                    </Label>
                    <div className="px-3 py-2 bg-muted/30 rounded-lg">
                      <Slider
                        value={[state.lineStyle.opacity]}
                        onValueChange={([value]) =>
                          dispatch({
                            type: "SET_LINE_STYLE_OPACITY",
                            opacity: value,
                          })
                        }
                        min={0.1}
                        max={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Curve Nodes for Lines and Arrows */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Curve Nodes: {state.lineNodes}
                    </Label>
                    <div className="px-3 py-2 bg-muted/30 rounded-lg">
                      <Slider
                        value={[state.lineNodes]}
                        onValueChange={([value]) =>
                          dispatch({
                            type: "SET_LINE_NODES",
                            nodes: value,
                          })
                        }
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 (straight)</span>
                      <span>5</span>
                      <span>10 (very curved)</span>
                    </div>
                  </div>

                  {/* Arrow Head Settings - Only for Arrow tool */}
                  {state.currentTool === "arrow" && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center space-x-2">
                        <div
                          className="w-4 h-2 bg-current"
                          style={{
                            clipPath: "polygon(0 50%, 100% 0, 100% 100%)",
                          }}
                        ></div>
                        <span>Arrow Heads</span>
                      </Label>

                      <div className="space-y-4">
                        {/* Start Arrowhead */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Start Arrow
                          </Label>
                          <div className="grid grid-cols-5 gap-1">
                            {[
                              { value: "none", label: "None", icon: "─" },
                              { value: "arrow", label: "Arrow", icon: "←" },
                              {
                                value: "triangle",
                                label: "Triangle",
                                icon: "◀",
                              },
                              {
                                value: "triangle_outline",
                                label: "Triangle Outline",
                                icon: "◁",
                              },
                              { value: "dot", label: "Dot", icon: "●" },
                            ].map((head) => (
                              <Button
                                key={head.value}
                                variant={
                                  state.arrowSettings.startArrowhead ===
                                  head.value
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  dispatch({
                                    type: "SET_START_ARROWHEAD",
                                    arrowhead: head.value as any,
                                  })
                                }
                                className="text-xs py-1 h-8 flex flex-col items-center"
                                title={head.label}
                              >
                                <span className="text-sm">{head.icon}</span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* End Arrowhead */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            End Arrow
                          </Label>
                          <div className="grid grid-cols-5 gap-1">
                            {[
                              { value: "none", label: "None", icon: "─" },
                              { value: "arrow", label: "Arrow", icon: "→" },
                              {
                                value: "triangle",
                                label: "Triangle",
                                icon: "▶",
                              },
                              {
                                value: "triangle_outline",
                                label: "Triangle Outline",
                                icon: "▷",
                              },
                              { value: "dot", label: "Dot", icon: "●" },
                            ].map((head) => (
                              <Button
                                key={head.value}
                                variant={
                                  state.arrowSettings.endArrowhead ===
                                  head.value
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  dispatch({
                                    type: "SET_END_ARROWHEAD",
                                    arrowhead: head.value as any,
                                  })
                                }
                                className="text-xs py-1 h-8 flex flex-col items-center"
                                title={head.label}
                              >
                                <span className="text-sm">{head.icon}</span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Arrow Binding Toggle */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                              Shape Binding
                            </Label>
                            <Button
                              variant={
                                state.arrowSettings.enableBinding
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                dispatch({
                                  type: "SET_ARROW_BINDING_ENABLED",
                                  enabled: !state.arrowSettings.enableBinding,
                                })
                              }
                              className="text-xs py-1 h-7"
                            >
                              {state.arrowSettings.enableBinding ? "On" : "Off"}
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {state.arrowSettings.enableBinding
                              ? "Arrows will stick to shapes when close"
                              : "Arrows will not bind to shapes"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Tool Controls */}
        {state.currentTool === "text" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Type className="w-4 h-4 text-blue-500" />
                <Label className="text-sm font-medium">Text Color</Label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Input
                      type="color"
                      value={state.brushColor}
                      onChange={(e) => handleBrushColorChange(e.target.value)}
                      className="w-14 h-10 p-1 border-2 rounded-lg cursor-pointer"
                    />
                    <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-black/10"></div>
                  </div>
                  <Input
                    type="text"
                    value={state.brushColor}
                    onChange={(e) => handleBrushColorChange(e.target.value)}
                    className="flex-1 font-mono text-xs bg-muted/50"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Font Size</Label>
              <div className="space-y-3">
                <div className="px-3 py-2 bg-muted/30 rounded-lg">
                  <Slider
                    value={[state.textStyle.fontSize]}
                    onValueChange={(value) =>
                      dispatch({
                        type: "SET_TEXT_FONT_SIZE",
                        fontSize: value[0],
                      })
                    }
                    min={8}
                    max={72}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">8px</span>
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                    {state.textStyle.fontSize}px
                  </div>
                  <span className="text-muted-foreground">72px</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Font Family</Label>
              <div className="space-y-2">
                <select
                  value={state.textStyle.fontFamily}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_TEXT_FONT_FAMILY",
                      fontFamily: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="Arial">Arial</option>
                  <option value="Arial Black">Arial Black</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Impact">Impact</option>
                  <option value="Lucida Console">Lucida Console</option>
                  <option value="Palatino">Palatino</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Caveat">'Caveat' (Handwritten)</option>
                </select>

                {/* Google Fonts Integration */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Google Font name (e.g., Roboto)"
                    className="flex-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const fontName = (
                          e.target as HTMLInputElement
                        ).value.trim();
                        if (fontName) {
                          // Load Google Font dynamically
                          const link = document.createElement("link");
                          link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
                          link.rel = "stylesheet";
                          document.head.appendChild(link);

                          // Update font family
                          dispatch({
                            type: "SET_TEXT_FONT_FAMILY",
                            fontFamily: fontName,
                          });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      const input = document.querySelector(
                        'input[placeholder*="Google Font"]',
                      ) as HTMLInputElement;
                      if (input && input.value.trim()) {
                        const fontName = input.value.trim();
                        // Load Google Font dynamically
                        const link = document.createElement("link");
                        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
                        link.rel = "stylesheet";
                        document.head.appendChild(link);

                        // Update font family
                        dispatch({
                          type: "SET_TEXT_FONT_FAMILY",
                          fontFamily: fontName,
                        });
                        input.value = "";
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>

                {/* Popular Google Fonts Quick Access */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Popular Fonts
                  </Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      "Roboto",
                      "Open Sans",
                      "Lato",
                      "Montserrat",
                      "Poppins",
                      "Source Sans Pro",
                    ].map((font) => (
                      <Button
                        key={font}
                        size="sm"
                        variant={
                          state.textStyle.fontFamily === font
                            ? "default"
                            : "outline"
                        }
                        className="text-xs h-7"
                        onClick={() => {
                          // Load Google Font dynamically
                          const link = document.createElement("link");
                          link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
                          link.rel = "stylesheet";
                          document.head.appendChild(link);

                          dispatch({
                            type: "SET_TEXT_FONT_FAMILY",
                            fontFamily: font,
                          });
                        }}
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Text Styling</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={state.textStyle.bold ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: "SET_TEXT_BOLD",
                      bold: !state.textStyle.bold,
                    })
                  }
                  className="text-xs font-bold"
                >
                  <strong>B</strong>
                </Button>
                <Button
                  variant={state.textStyle.italic ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: "SET_TEXT_ITALIC",
                      italic: !state.textStyle.italic,
                    })
                  }
                  className="text-xs italic"
                >
                  <em>I</em>
                </Button>
                <Button
                  variant={state.textStyle.underline ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: "SET_TEXT_UNDERLINE",
                      underline: !state.textStyle.underline,
                    })
                  }
                  className="text-xs underline"
                >
                  <span style={{ textDecoration: "underline" }}>U</span>
                </Button>
              </div>
            </div>

            {/* Text Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="p-3 bg-muted/20 rounded-lg border border-muted/40 min-h-[40px] flex items-center">
                <span
                  style={{
                    fontSize: `${state.textStyle.fontSize}px`,
                    fontFamily: state.textStyle.fontFamily,
                    fontWeight: state.textStyle.bold ? "bold" : "normal",
                    fontStyle: state.textStyle.italic ? "italic" : "normal",
                    textDecoration: state.textStyle.underline
                      ? "underline"
                      : "none",
                    color: state.brushColor,
                  }}
                >
                  Sample Text
                </span>
              </div>
            </div>
          </div>
        )}

        {(state.currentTool === "rectangle" ||
          state.currentTool === "ellipse" ||
          state.currentTool === "diamond") && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Outline Color</Label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Input
                      type="color"
                      value={state.brushColor}
                      onChange={(e) => handleBrushColorChange(e.target.value)}
                      className="w-14 h-10 p-1 border-2 rounded-lg cursor-pointer"
                    />
                    <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-black/10"></div>
                  </div>
                  <Input
                    type="text"
                    value={state.brushColor}
                    onChange={(e) => handleBrushColorChange(e.target.value)}
                    className="flex-1 font-mono text-xs bg-muted/50"
                    placeholder="#000000"
                  />
                </div>

                {/* Outline Color Presets */}
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Color Palette
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {colorPresets.map((color) => (
                      <Button
                        key={color}
                        variant="ghost"
                        size="color-box"
                        className={cn(
                          "rounded-md border-2 transition-all duration-200 hover:scale-105 relative",
                          state.brushColor === color
                            ? "border-primary ring-2 ring-primary/20 scale-110 shadow-md"
                            : "border-transparent hover:border-muted-foreground/50",
                        )}
                        style={{
                          backgroundColor:
                            color === "transparent" ? "#fff" : color,
                          backgroundImage:
                            color === "transparent"
                              ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px"
                              : "none",
                        }}
                        onClick={() => handleBrushColorChange(color)}
                        title={color === "transparent" ? "No Outline" : color}
                      >
                        {color === "transparent" && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-red-500 rotate-45"></div>
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fill Pattern - moved here from bottom */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <div
                  className="w-4 h-4 border border-current rounded"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)",
                    opacity: 0.3,
                  }}
                ></div>
                <span>Fill Pattern</span>
              </Label>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "none", label: "None", icon: "⬜" },
                  { value: "hachure", label: "Hachure", icon: "📏" },
                  { value: "cross-hatch", label: "Cross", icon: "⚏" },
                  { value: "solid", label: "Solid", icon: "⬛" },
                ].map((pattern) => (
                  <Button
                    key={pattern.value}
                    variant={
                      state.backgroundPattern === pattern.value
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      dispatch({
                        type: "SET_BACKGROUND_PATTERN",
                        pattern: pattern.value as any,
                      })
                    }
                    className="text-xs py-2 h-auto flex flex-col space-y-1"
                  >
                    <span className="text-base">{pattern.icon}</span>
                    <span>{pattern.label}</span>
                  </Button>
                ))}
              </div>

              {/* Pattern Rotation - only show for hachure pattern */}
              {state.backgroundPattern === "hachure" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Pattern Rotation: {state.fillPatternRotation}°
                  </Label>
                  <div className="px-3 py-2 bg-muted/30 rounded-lg">
                    <Slider
                      value={[state.fillPatternRotation]}
                      onValueChange={([value]) =>
                        dispatch({
                          type: "SET_FILL_PATTERN_ROTATION",
                          rotation: value,
                        })
                      }
                      min={0}
                      max={360}
                      step={15}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0°</span>
                    <span>180°</span>
                    <span>360°</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fill Color - disabled when pattern is none */}
            <div
              className={cn(
                "space-y-3",
                state.backgroundPattern === "none" &&
                  "opacity-50 pointer-events-none",
              )}
            >
              <Label className="text-sm font-medium flex items-center space-x-2">
                <div className="w-4 h-4 bg-current/20 border border-current rounded"></div>
                <span>Fill Color</span>
                {state.backgroundPattern === "none" && (
                  <span className="text-xs text-muted-foreground">
                    (Select a pattern first)
                  </span>
                )}
              </Label>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Input
                      type="color"
                      value={
                        state.fillColor === "transparent"
                          ? "#ffffff"
                          : state.fillColor
                      }
                      onChange={(e) => handleFillColorChange(e.target.value)}
                      className="w-14 h-10 p-1 border-2 rounded-lg cursor-pointer"
                      disabled={
                        state.fillColor === "transparent" ||
                        state.backgroundPattern === "none"
                      }
                    />
                    <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-black/10"></div>
                    {state.fillColor === "transparent" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-0.5 bg-red-500 rotate-45"></div>
                      </div>
                    )}
                  </div>
                  <Input
                    type="text"
                    value={state.fillColor}
                    onChange={(e) => handleFillColorChange(e.target.value)}
                    className="flex-1 font-mono text-xs bg-muted/50"
                    placeholder="transparent"
                    disabled={state.backgroundPattern === "none"}
                  />
                </div>

                {/* Fill Color Presets */}
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fill Palette
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {fillColorPresets.map((color) => (
                      <Button
                        key={color}
                        variant="ghost"
                        size="color-box"
                        className={cn(
                          "rounded-md border-2 transition-all duration-200 hover:scale-105 relative",
                          state.fillColor === color
                            ? "border-primary ring-2 ring-primary/20 scale-110 shadow-md"
                            : "border-transparent hover:border-muted-foreground/50",
                        )}
                        style={{
                          backgroundColor:
                            color === "transparent" ? "#fff" : color,
                          backgroundImage:
                            color === "transparent"
                              ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px"
                              : "none",
                        }}
                        onClick={() => handleFillColorChange(color)}
                        title={color === "transparent" ? "No Fill" : color}
                        disabled={state.backgroundPattern === "none"}
                      >
                        {color === "transparent" && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-red-500 rotate-45"></div>
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  variant={
                    state.fillColor === "transparent" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleFillColorChange("transparent")}
                  className="w-full text-xs"
                  disabled={state.backgroundPattern === "none"}
                >
                  {state.fillColor === "transparent"
                    ? "✓ No Fill"
                    : "Remove Fill"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-current rounded"></div>
                <span>Stroke Width</span>
              </Label>

              <div className="space-y-3">
                <div className="px-3 py-2 bg-muted/30 rounded-lg">
                  <Slider
                    value={[state.brushSize]}
                    onValueChange={handleBrushSizeChange}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">1px</span>
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                    {state.brushSize}px
                  </div>
                  <span className="text-muted-foreground">20px</span>
                </div>
              </div>
            </div>

            {/* Roughness Control */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Brush className="w-4 h-4" />
                <span>Hand-drawn Style</span>
              </Label>

              <div className="space-y-3">
                <div className="px-3 py-2 bg-muted/30 rounded-lg">
                  <Slider
                    value={[state.roughness]}
                    onValueChange={(value) =>
                      dispatch({ type: "SET_ROUGHNESS", roughness: value[0] })
                    }
                    max={3}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Smooth</span>
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                    {state.roughness.toFixed(1)}
                  </div>
                  <span className="text-muted-foreground">Rough</span>
                </div>
              </div>
            </div>

            {/* Stroke Style Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Brush className="w-4 h-4" />
                <span>Stroke Style</span>
              </Label>

              <div className="space-y-3">
                {/* Sloppiness Presets */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Sloppiness
                  </Label>
                  <div className="grid grid-cols-3 gap-1">
                    {Object.entries(SLOPPINESS_PRESETS).map(([key, preset]) => (
                      <Button
                        key={key}
                        variant={
                          state.sloppiness === preset.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          dispatch({
                            type: "SET_SLOPPINESS",
                            sloppiness: preset.value,
                          })
                        }
                        className="text-xs py-1 h-7"
                        title={preset.description}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Smoothing */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Smoothing: {Math.round(state.strokeSmoothing * 100)}%
                  </Label>
                  <div className="px-3 py-2 bg-muted/30 rounded-lg">
                    <Slider
                      value={[state.strokeSmoothing]}
                      onValueChange={([value]) =>
                        dispatch({
                          type: "SET_STROKE_SMOOTHING",
                          smoothing: value,
                        })
                      }
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Pressure */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Pressure Variation
                  </Label>
                  <Button
                    variant={state.pressureEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      dispatch({
                        type: "SET_PRESSURE_ENABLED",
                        enabled: !state.pressureEnabled,
                      })
                    }
                    className="text-xs py-1 h-7"
                  >
                    {state.pressureEnabled ? "On" : "Off"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Shape Outline Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-current"></div>
                <span>Shape Outline</span>
              </Label>

              <div className="space-y-3">
                {/* Line Type */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "solid", label: "Solid", pattern: "─────" },
                    { value: "dashed", label: "Dashed", pattern: "── ── ──" },
                    { value: "dotted", label: "Dotted", pattern: "·····" },
                  ].map((style) => (
                    <Button
                      key={style.value}
                      variant={
                        state.lineStyle.type === style.value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        dispatch({
                          type: "SET_LINE_STYLE_TYPE",
                          lineType: style.value as any,
                        })
                      }
                      className="text-xs py-2 h-auto flex flex-col space-y-1"
                    >
                      <span className="font-mono text-xs">{style.pattern}</span>
                      <span>{style.label}</span>
                    </Button>
                  ))}
                </div>

                {/* Line Intensity */}
                {state.lineStyle.type !== "solid" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Pattern Intensity: {state.lineStyle.intensity}
                    </Label>
                    <div className="px-3 py-2 bg-muted/30 rounded-lg">
                      <Slider
                        value={[state.lineStyle.intensity]}
                        onValueChange={([value]) =>
                          dispatch({
                            type: "SET_LINE_STYLE_INTENSITY",
                            intensity: value,
                          })
                        }
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Line Opacity */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Opacity: {Math.round(state.lineStyle.opacity * 100)}%
                  </Label>
                  <div className="px-3 py-2 bg-muted/30 rounded-lg">
                    <Slider
                      value={[state.lineStyle.opacity]}
                      onValueChange={([value]) =>
                        dispatch({
                          type: "SET_LINE_STYLE_OPACITY",
                          opacity: value,
                        })
                      }
                      min={0.1}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Eraser Tool Controls */}
        {state.currentTool === "eraser" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Eraser className="w-4 h-4 text-red-500" />
                <Label className="text-sm font-medium">Eraser Mode</Label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={
                    state.eraserMode === "normal" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    dispatch({ type: "SET_ERASER_MODE", mode: "normal" })
                  }
                  className="text-xs py-2 h-auto flex flex-col space-y-1"
                >
                  <Eraser className="w-4 h-4" />
                  <span>Normal</span>
                  <span className="text-xs text-muted-foreground">
                    Area erase
                  </span>
                </Button>
                <Button
                  variant={
                    state.eraserMode === "element" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    dispatch({ type: "SET_ERASER_MODE", mode: "element" })
                  }
                  className="text-xs py-2 h-auto flex flex-col space-y-1"
                >
                  <Target className="w-4 h-4" />
                  <span>Element</span>
                  <span className="text-xs text-muted-foreground">
                    Click to delete
                  </span>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-current"></div>
                <span>Eraser Size</span>
              </Label>

              <div className="space-y-3">
                <div className="px-3 py-2 bg-muted/30 rounded-lg">
                  <Slider
                    value={[state.eraserSize]}
                    onValueChange={(value) =>
                      dispatch({ type: "SET_ERASER_SIZE", size: value[0] })
                    }
                    min={5}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">5px</span>
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full font-medium">
                    {state.eraserSize}px
                  </div>
                  <span className="text-muted-foreground">50px</span>
                </div>

                {/* Visual eraser preview */}
                <div className="flex items-center justify-center p-3 bg-muted/20 rounded-lg">
                  <div
                    className="rounded-full border-2 border-red-500 bg-red-500/20"
                    style={{
                      width: `${Math.max(state.eraserSize / 2, 4)}px`,
                      height: `${Math.max(state.eraserSize / 2, 4)}px`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Eraser Mode Description */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <Label className="text-sm font-medium text-red-700 dark:text-red-300">
                  {state.eraserMode === "normal"
                    ? "Normal Eraser"
                    : "Element Eraser"}
                </Label>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">
                {state.eraserMode === "normal"
                  ? "Drag to erase parts of strokes and shapes within the eraser area."
                  : "Click on any element to delete it completely."}
              </div>
            </div>
          </div>
        )}

        {/* Select Tool Controls */}
        {state.currentTool === "select" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MousePointer className="w-4 h-4 text-blue-500" />
                <Label className="text-sm font-medium">Selection Mode</Label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={!state.deepSelect ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    dispatch({ type: "SET_DEEP_SELECT", deepSelect: false })
                  }
                  className="text-xs py-2 h-auto flex flex-col space-y-1"
                >
                  <MousePointer className="w-4 h-4" />
                  <span>Normal</span>
                  <span className="text-xs text-muted-foreground">
                    Surface select
                  </span>
                </Button>
                <Button
                  variant={state.deepSelect ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    dispatch({ type: "SET_DEEP_SELECT", deepSelect: true })
                  }
                  className="text-xs py-2 h-auto flex flex-col space-y-1"
                >
                  <Layers className="w-4 h-4" />
                  <span>Deep</span>
                  <span className="text-xs text-muted-foreground">
                    All inside
                  </span>
                </Button>
              </div>
            </div>

            {/* Selection Mode Description */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {state.deepSelect ? "Deep Select" : "Normal Select"}
                </Label>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {state.deepSelect
                  ? "Selects all elements inside shapes and groups across all layers."
                  : "Selects only the top-most element at the click position."}
              </div>
            </div>

            {state.selectedElements.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">
                    Selection Active
                  </Label>
                </div>

                <div className="text-sm text-green-600 dark:text-green-400">
                  {state.selectedElements.length} element
                  {state.selectedElements.length !== 1 ? "s" : ""} selected
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => dispatch({ type: "DELETE_SELECTED" })}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Canvas Info */}
        <div className="bg-muted/10 rounded-xl p-4 space-y-3 border border-muted/20">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Canvas Info
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-background/60 rounded-lg p-3 border border-muted/30">
              <div className="text-muted-foreground font-medium">Zoom</div>
              <div className="font-bold text-lg text-foreground">
                {Math.round(state.viewTransform.scale * 100)}%
              </div>
            </div>
            <div className="bg-background/60 rounded-lg p-3 border border-muted/30">
              <div className="text-muted-foreground font-medium">Elements</div>
              <div className="font-bold text-lg text-foreground">
                {state.elements.length}
              </div>
            </div>
          </div>
          <div className="bg-background/60 rounded-lg p-3 border border-muted/30">
            <div className="text-muted-foreground text-xs font-medium">
              Active Layer
            </div>
            <div className="font-semibold text-sm text-foreground">
              {state.layers.find((l) => l.id === state.activeLayerId)?.name}
            </div>
          </div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
