import React, { useState } from "react";
import { useTextTool } from "../../contexts/TextToolContext";
import { useDrawing } from "../../contexts/DrawingContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Type,
  Keyboard,
  Pen,
  Upload,
  Trash2,
  Palette,
  Eye,
  Download,
} from "lucide-react";
import { cn } from "../../lib/utils";

const textColorPresets = [
  "#000000", // Black
  "#ffffff", // White
  "#e03131", // Red
  "#2f9e44", // Green
  "#1971c2", // Blue
  "#f08c00", // Orange
  "#ae3ec9", // Purple
  "#00a8cc", // Cyan
  "#fa5252", // Light Red
  "#51cf66", // Light Green
  "#339af0", // Light Blue
  "#ff8cc8", // Pink
  "#74c0fc", // Light Cyan
  "#8ce99a", // Light Green 2
  "#ffd43b", // Yellow
  "#495057", // Dark Gray
  "#868e96", // Gray
  "#ced4da", // Light Gray
  "#f1f3f4", // Very Light Gray
  "#212529", // Very Dark Gray
];

const inputBoxColorPresets = [
  "#3b82f6", // Blue (default)
  "#ef4444", // Red
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#6366f1", // Indigo
];

const systemFonts = [
  "Arial, sans-serif",
  "Helvetica, sans-serif",
  "Times New Roman, serif",
  "Georgia, serif",
  "Verdana, sans-serif",
  "Courier New, monospace",
  "Arial Black, sans-serif",
  "Comic Sans MS, cursive",
  "Impact, sans-serif",
  "Trebuchet MS, sans-serif",
  "Palatino, serif",
  "Garamond, serif",
];

export function TextToolProperties() {
  const { state: textState, dispatch: textDispatch } = useTextTool();
  const { state: drawingState } = useDrawing();
  const [fontFile, setFontFile] = useState<File | null>(null);

  const handleModeSwitch = (mode: "keyboard" | "stylus") => {
    textDispatch({ type: "SET_INPUT_MODE", mode });
  };

  const handleFontSizeChange = (value: number[]) => {
    textDispatch({ type: "SET_FONT_SIZE", size: value[0] });
  };

  const handleFontFamilyChange = (family: string) => {
    textDispatch({ type: "SET_FONT_FAMILY", family });
  };

  const handleColorModeToggle = (useAutomatic: boolean) => {
    textDispatch({ type: "SET_USE_AUTOMATIC_COLOR", useAutomatic });
  };

  const handleTextColorChange = (color: string) => {
    textDispatch({ type: "SET_TEXT_COLOR", color });
  };

  const handleInputBoxOpacityChange = (value: number[]) => {
    textDispatch({ type: "SET_INPUT_BOX_OPACITY", opacity: value[0] });
  };

  const handleInputBoxColorChange = (color: string) => {
    textDispatch({ type: "SET_INPUT_BOX_COLOR", color });
  };

  const handleWordSpacingChange = (value: number[]) => {
    textDispatch({ type: "SET_WORD_SPACING", spacing: value[0] });
  };

  const handleFontImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const supportedFormats = [".ttf", ".otf", ".woff", ".woff2"];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));

      if (supportedFormats.includes(fileExtension)) {
        try {
          const fontName = file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, " ");

          // Create a font face and load it
          const fontFace = new FontFace(
            fontName,
            `url(${URL.createObjectURL(file)})`,
          );

          await fontFace.load();
          document.fonts.add(fontFace);
          textDispatch({ type: "ADD_CUSTOM_FONT", fontName: fontName });

          // Update current font if this is the first imported font
          if (textState.customFonts.length === 0) {
            textDispatch({ type: "SET_FONT_FAMILY", family: fontName });
          }
        } catch (error) {
          console.error(`Failed to load font ${file.name}:`, error);
        }
      }
    }

    // Clear the input
    event.target.value = "";
  };

  const handleRemoveCustomFont = (fontName: string) => {
    textDispatch({ type: "REMOVE_CUSTOM_FONT", fontName });
  };

  // Get effective text color (automatic or manual)
  const effectiveTextColor = textState.useAutomaticColor
    ? drawingState.brushColor
    : textState.textColor;

  return (
    <AnimatedFloatingPanel
      id="text-properties"
      title="Text Tool Properties"
      defaultPosition={{ x: 100, y: 150 }}
      icon={Type}
    >
      <div className="space-y-6 p-4">
        {/* Input Mode - Stylus Only */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pen className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium">
              Stylus Text Input Mode
            </Label>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground">
              <strong>How to use:</strong>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Tap canvas to position input box</li>
              <li>Write with stylus or type</li>
              <li>
                Press <strong>Spacebar</strong> to add words
              </li>
              <li>
                Press <strong>Enter</strong> to finish
              </li>
              <li>Supports ink-to-text conversion</li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* Font Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Font Settings</Label>

          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-xs">Font Size: {textState.fontSize}px</Label>
            <Slider
              value={[textState.fontSize]}
              onValueChange={handleFontSizeChange}
              min={8}
              max={72}
              step={1}
              className="w-full"
            />
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-xs">Font Family</Label>
            <Select
              value={textState.fontFamily}
              onValueChange={handleFontFamilyChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {systemFonts.map((font) => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: font }}>
                      {font.split(",")[0]}
                    </span>
                  </SelectItem>
                ))}
                {textState.customFonts.map((font) => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: font }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Font Import */}
          <div className="space-y-2">
            <Label className="text-xs">Import Custom Font</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFontImport}
                className="flex-1 text-xs"
                multiple
              />
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4" />
              </Button>
            </div>

            {/* Custom Fonts List */}
            {textState.customFonts.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <Label className="text-xs text-muted-foreground">
                  Imported Fonts
                </Label>
                {textState.customFonts.map((font) => (
                  <div
                    key={font}
                    className="flex items-center justify-between bg-muted/50 p-2 rounded text-xs"
                  >
                    <span
                      style={{ fontFamily: font }}
                      className="flex-1 truncate"
                    >
                      {font}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveCustomFont(font)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
              Supports: TTF, OTF, WOFF, WOFF2 formats
            </div>
          </div>
        </div>

        <Separator />

        {/* Text Color Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Text Color</Label>

          {/* Automatic/Manual Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Use Pencil Color</Label>
            <Switch
              checked={textState.useAutomaticColor}
              onCheckedChange={handleColorModeToggle}
            />
          </div>

          {/* Color Preview */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border-2 border-border"
              style={{ backgroundColor: effectiveTextColor }}
            />
            <span className="text-xs text-muted-foreground">
              {textState.useAutomaticColor ? "Auto (Pencil)" : "Manual"}
            </span>
          </div>

          {/* Manual Color Selection */}
          {!textState.useAutomaticColor && (
            <div className="space-y-2">
              <Label className="text-xs">Color Presets</Label>
              <div className="grid grid-cols-5 gap-1">
                {textColorPresets.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded border-2 hover:scale-110 transition-transform",
                      textState.textColor === color
                        ? "border-gray-900 dark:border-gray-100"
                        : "border-gray-300 dark:border-gray-600",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleTextColorChange(color)}
                    title={`Set text color to ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stylus Mode Specific Settings */}
        {textState.inputMode === "stylus" && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Stylus Text Settings
              </Label>

              {/* Word Spacing */}
              <div className="space-y-2">
                <Label className="text-xs">
                  Word Spacing:{" "}
                  {textState.wordSpacing === 0.1
                    ? "0.1 (minimal)"
                    : textState.wordSpacing === 0.25
                      ? "0.25 (tight)"
                      : textState.wordSpacing === 0.5
                        ? "0.5 (compact)"
                        : textState.wordSpacing +
                          " space" +
                          (textState.wordSpacing !== 1 ? "s" : "")}
                </Label>
                <Slider
                  value={[textState.wordSpacing]}
                  onValueChange={handleWordSpacingChange}
                  min={0.1}
                  max={20}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.1 (minimal)</span>
                  <span>20 spaces</span>
                </div>

                {/* Spacing Presets */}
                <div className="flex gap-1">
                  {[0.1, 0.25, 0.5, 1, 2, 3].map((spacing) => (
                    <Button
                      key={spacing}
                      variant={
                        textState.wordSpacing === spacing
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handleWordSpacingChange([spacing])}
                      className="text-xs px-2 py-1 h-6"
                    >
                      {spacing === 0.1
                        ? "Min"
                        : spacing === 0.25
                          ? "Tight"
                          : spacing === 0.5
                            ? "Comp"
                            : spacing}
                    </Button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                  Controls spacing between words when using spacebar
                </div>

                {/* Word Spacing Preview */}
                <div className="space-y-2">
                  <Label className="text-xs">Preview (Canvas Accurate)</Label>
                  <div
                    className="p-3 border-2 border-dashed border-border rounded bg-background/50"
                    style={{
                      fontSize: `${Math.min(textState.fontSize, 16)}px`,
                      fontFamily: textState.fontFamily,
                      color: effectiveTextColor,
                      fontFeatureSettings: "'kern' 1", // Enable kerning for accurate rendering
                    }}
                  >
                    <canvas
                      ref={(canvas) => {
                        if (canvas) {
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            const fontSize = Math.min(textState.fontSize, 16);
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.font = `${fontSize}px ${textState.fontFamily}`;
                            ctx.fillStyle = effectiveTextColor;

                            // Simulate actual spacing calculation
                            let x = 10;
                            const y = fontSize + 5;
                            const words = ["hello", "world", "test"];

                            words.forEach((word, index) => {
                              ctx.fillText(word, x, y);
                              const wordWidth = ctx.measureText(word).width;
                              const singleSpaceWidth =
                                ctx.measureText(" ").width;

                              // Apply same spacing logic as in StylusTextInput
                              let adjustedSpacing;
                              if (textState.wordSpacing < 1) {
                                adjustedSpacing =
                                  singleSpaceWidth *
                                  textState.wordSpacing *
                                  0.5;
                              } else {
                                adjustedSpacing =
                                  singleSpaceWidth * textState.wordSpacing;
                              }

                              x += wordWidth + adjustedSpacing;
                            });
                          }
                        }
                      }}
                      width={250}
                      height={30}
                      className="w-full h-8"
                    />
                  </div>
                </div>
              </div>

              <Separator />
              <Label className="text-sm font-medium">Input Box Settings</Label>

              {/* Opacity */}
              <div className="space-y-2">
                <Label className="text-xs">
                  Transparency: {textState.inputBoxOpacity}%
                </Label>
                <Slider
                  value={[textState.inputBoxOpacity]}
                  onValueChange={handleInputBoxOpacityChange}
                  min={10}
                  max={90}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Input Box Color */}
              <div className="space-y-2">
                <Label className="text-xs">Input Box Color</Label>
                <div className="grid grid-cols-5 gap-1">
                  {inputBoxColorPresets.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-6 h-6 rounded border-2 hover:scale-110 transition-transform",
                        textState.inputBoxColor === color
                          ? "border-gray-900 dark:border-gray-100"
                          : "border-gray-300 dark:border-gray-600",
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => handleInputBoxColorChange(color)}
                      title={`Set input box color to ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-xs">Preview</Label>
                <div
                  className="w-full h-12 border-2 border-dashed border-border rounded flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: `${textState.inputBoxColor}${Math.round(
                      textState.inputBoxOpacity * 2.55,
                    )
                      .toString(16)
                      .padStart(2, "0")}`,
                  }}
                >
                  Input Box Preview (3" × 1")
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AnimatedFloatingPanel>
  );
}
