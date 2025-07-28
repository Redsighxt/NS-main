import React, { useState } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useAnimation } from "../../contexts/AnimationContext";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Download, Image, FileText, Video, Upload } from "lucide-react";
import { toast } from "../ui/use-toast";
import { Input } from "../ui/input";

type ExportFormat = "png" | "svg" | "json" | "mp4";

interface ExportOptions {
  format: ExportFormat;
  quality: "low" | "medium" | "high";
  resolution: "720p" | "1080p" | "4k";
  background: "transparent" | "white" | "black";
}

export function ExportManager() {
  const { state: drawingState, dispatch } = useDrawing();
  const { state: animationState } = useAnimation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: "png",
    quality: "high",
    resolution: "1080p",
    background: "transparent",
  });

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      switch (options.format) {
        case "png":
          await exportPNG();
          break;
        case "svg":
          await exportSVG();
          break;
        case "json":
          await exportJSON();
          break;
        case "mp4":
          await exportMP4();
          break;
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your drawing.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const exportPNG = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Set canvas size based on resolution
    const resolutions = {
      "720p": { width: 1280, height: 720 },
      "1080p": { width: 1920, height: 1080 },
      "4k": { width: 3840, height: 2160 },
    };

    const { width, height } = resolutions[options.resolution];
    canvas.width = width;
    canvas.height = height;

    // Set background
    if (options.background !== "transparent") {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, width, height);
    }

    setExportProgress(20);

    // Calculate bounds of all elements
    const bounds = calculateBounds();
    const scale = Math.min(
      width / (bounds.width + 100),
      height / (bounds.height + 100),
    );

    const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;

    setExportProgress(40);

    // Draw all visible elements
    const visibleElements = drawingState.elements.filter(element => {
      const layer = drawingState.layers.find((l) => l.id === element.layerId);
      return layer?.visible;
    });

    visibleElements.forEach((element, index) => {
      drawElementToCanvas(ctx, element, scale, offsetX, offsetY);
      setExportProgress(40 + (index / visibleElements.length) * 40);
    });

    setExportProgress(90);

    // Download the image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `drawing-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setExportProgress(100);

        toast({
          title: "Export Complete",
          description: "Your drawing has been exported as PNG.",
        });
      }
    }, "image/png");
  };

  const exportSVG = async () => {
    const bounds = calculateBounds();
    const width = bounds.width + 100;
    const height = bounds.height + 100;
    const offsetX = -bounds.minX + 50;
    const offsetY = -bounds.minY + 50;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

    if (options.background !== "transparent") {
      svg += `<rect width="100%" height="100%" fill="${options.background}"/>`;
    }

    setExportProgress(20);

    const visibleElements = drawingState.elements.filter(element => {
      const layer = drawingState.layers.find((l) => l.id === element.layerId);
      return layer?.visible;
    });

    visibleElements.forEach((element, index) => {
      svg += elementToSVG(element, offsetX, offsetY);
      setExportProgress(20 + (index / visibleElements.length) * 60);
    });

    svg += "</svg>";

    setExportProgress(90);

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drawing-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);

    setExportProgress(100);
    toast({
      title: "Export Complete",
      description: "Your drawing has been exported as SVG.",
    });
  };

  const exportJSON = async () => {
    const data = {
      version: "1.1",
      timestamp: Date.now(),
      elements: drawingState.elements,
      layers: drawingState.layers,
      viewTransform: drawingState.viewTransform,
      // Include drawing settings
      brushSettings: {
        brushColor: drawingState.brushColor,
        brushSize: drawingState.brushSize,
        fillColor: drawingState.fillColor,
        highlighterColor: drawingState.highlighterColor,
        highlighterOpacity: drawingState.highlighterOpacity,
        roughness: drawingState.roughness,
        backgroundPattern: drawingState.backgroundPattern,
        textStyle: drawingState.textStyle,
        lineStyle: drawingState.lineStyle,
      },
      // Include animation data if available
      animation:
        animationState.strokes.length > 0
          ? {
              strokes: animationState.strokes,
              settings: animationState.settings,
            }
          : null,
    };

    setExportProgress(50);

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drawing-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportProgress(100);
    toast({
      title: "Export Complete",
      description: "Your drawing has been exported as JSON.",
    });
  };

  const exportMP4 = async () => {
    toast({
      title: "Feature Coming Soon",
      description: "MP4 export is currently in development.",
    });
  };

  const calculateBounds = () => {
    if (drawingState.elements.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
        width: 100,
        height: 100,
      };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    drawingState.elements.forEach((element) => {
      const layer = drawingState.layers.find((l) => l.id === element.layerId);
      if (!layer?.visible) return; // Skip invisible layers

      if ((element.type === "path" || element.type === "highlighter") && element.points) {
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      } else if (element.type === "text") {
        // For text elements, calculate bounds based on text content
        const fontSize = element.style.fontSize || 16;
        const textWidth = element.width || (element.text || "").length * fontSize * 0.6;
        const textHeight = element.height || fontSize * 1.2;
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + textWidth);
        maxY = Math.max(maxY, element.y + textHeight);
      } else if ((element.type === "line" || element.type === "arrow") && element.points) {
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
        // Add some padding for arrow heads
        if (element.type === "arrow") {
          const padding = 20;
          minX -= padding;
          minY -= padding;
          maxX += padding;
          maxY += padding;
        }
      } else {
        // For shapes (rectangle, ellipse, diamond)
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + (element.width || 100));
        maxY = Math.max(maxY, element.y + (element.height || 100));
      }
    });

    // Add some padding around the content
    const padding = 20;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2),
    };
  };

  const drawElementToCanvas = (
    ctx: CanvasRenderingContext2D,
    element: any,
    scale: number,
    offsetX: number,
    offsetY: number,
  ) => {
    ctx.save();
    ctx.strokeStyle = element.style.stroke;
    ctx.lineWidth = element.style.strokeWidth * scale;
    ctx.fillStyle = element.style.fill || "transparent";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (element.type) {
      case "path":
        if (element.points && element.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(
            element.points[0].x * scale + offsetX,
            element.points[0].y * scale + offsetY,
          );

          if (element.points.length === 2) {
            ctx.lineTo(
              element.points[1].x * scale + offsetX,
              element.points[1].y * scale + offsetY,
            );
          } else {
            // Use quadratic curves for smooth paths
            for (let i = 1; i < element.points.length - 1; i++) {
              const midX = ((element.points[i].x + element.points[i + 1].x) / 2) * scale + offsetX;
              const midY = ((element.points[i].y + element.points[i + 1].y) / 2) * scale + offsetY;
              ctx.quadraticCurveTo(
                element.points[i].x * scale + offsetX,
                element.points[i].y * scale + offsetY,
                midX,
                midY,
              );
            }
            // Final point
            const lastPoint = element.points[element.points.length - 1];
            const secondLastPoint = element.points[element.points.length - 2];
            ctx.quadraticCurveTo(
              secondLastPoint.x * scale + offsetX,
              secondLastPoint.y * scale + offsetY,
              lastPoint.x * scale + offsetX,
              lastPoint.y * scale + offsetY,
            );
          }
          ctx.stroke();
        }
        break;

      case "highlighter":
        if (element.points && element.points.length > 1) {
          ctx.globalAlpha = element.opacity || 0.3;
          ctx.globalCompositeOperation = "multiply";
          ctx.lineWidth = (element.style.strokeWidth || 8) * scale;

          ctx.beginPath();
          ctx.moveTo(
            element.points[0].x * scale + offsetX,
            element.points[0].y * scale + offsetY,
          );

          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(
              element.points[i].x * scale + offsetX,
              element.points[i].y * scale + offsetY,
            );
          }
          ctx.stroke();

          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
        break;

      case "rectangle":
        const rectX = element.x * scale + offsetX;
        const rectY = element.y * scale + offsetY;
        const rectW = (element.width || 100) * scale;
        const rectH = (element.height || 100) * scale;

        ctx.beginPath();
        ctx.rect(rectX, rectY, rectW, rectH);
        if (element.style.fill && element.style.fill !== "transparent") {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case "ellipse":
        const ellipseX = element.x * scale + offsetX;
        const ellipseY = element.y * scale + offsetY;
        const rx = ((element.width || 100) / 2) * scale;
        const ry = ((element.height || 100) / 2) * scale;

        ctx.beginPath();
        ctx.ellipse(ellipseX + rx, ellipseY + ry, rx, ry, 0, 0, 2 * Math.PI);
        if (element.style.fill && element.style.fill !== "transparent") {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case "line":
        if (element.points && element.points.length >= 2) {
          const [start, end] = element.points;
          ctx.beginPath();
          ctx.moveTo(start.x * scale + offsetX, start.y * scale + offsetY);
          ctx.lineTo(end.x * scale + offsetX, end.y * scale + offsetY);
          ctx.stroke();
        }
        break;

      case "arrow":
        if (element.points && element.points.length >= 2) {
          const [start, end] = element.points;
          const headLength = 15 * scale;
          const angle = Math.atan2(end.y - start.y, end.x - start.x);

          // Draw line
          ctx.beginPath();
          ctx.moveTo(start.x * scale + offsetX, start.y * scale + offsetY);
          ctx.lineTo(end.x * scale + offsetX, end.y * scale + offsetY);
          ctx.stroke();

          // Draw arrowhead
          const endX = end.x * scale + offsetX;
          const endY = end.y * scale + offsetY;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6),
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6),
          );
          ctx.stroke();
        }
        break;

      case "text":
        const fontSize = (element.style.fontSize || 16) * scale;
        const fontFamily = element.style.fontFamily || "Arial";
        let fontStyle = "";

        if (element.bold) fontStyle += "bold ";
        if (element.italic) fontStyle += "italic ";

        ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;
        ctx.fillStyle = element.style.stroke;
        ctx.textBaseline = "top";

        const text = element.text || "";
        const x = element.x * scale + offsetX;
        const y = element.y * scale + offsetY;

        // Draw text background if needed
        if (element.style.fill && element.style.fill !== "transparent" && element.style.fill !== element.style.stroke) {
          const metrics = ctx.measureText(text);
          ctx.fillStyle = element.style.fill;
          ctx.fillRect(x - 2, y - 2, metrics.width + 4, fontSize + 4);
        }

        // Draw main text
        ctx.fillStyle = element.style.stroke;
        ctx.fillText(text, x, y);

        // Draw underline if needed
        if (element.underline) {
          const metrics = ctx.measureText(text);
          ctx.beginPath();
          ctx.moveTo(x, y + fontSize);
          ctx.lineTo(x + metrics.width, y + fontSize);
          ctx.strokeStyle = element.style.stroke;
          ctx.lineWidth = Math.max(1, fontSize / 16);
          ctx.stroke();
        }
        break;
    }

    ctx.restore();
  };

  const elementToSVG = (
    element: any,
    offsetX: number,
    offsetY: number,
  ): string => {
    const style = `stroke="${element.style.stroke}" stroke-width="${element.style.strokeWidth}" fill="${element.style.fill || "none"}" stroke-linecap="round" stroke-linejoin="round"`;

    switch (element.type) {
      case "path":
        if (element.points && element.points.length > 1) {
          const pathData = element.points
            .map(
              (point: any, index: number) =>
                `${index === 0 ? "M" : "L"} ${point.x + offsetX} ${point.y + offsetY}`,
            )
            .join(" ");
          return `<path d="${pathData}" ${style}/>`;
        }
        break;

      case "highlighter":
        if (element.points && element.points.length > 1) {
          const pathData = element.points
            .map(
              (point: any, index: number) =>
                `${index === 0 ? "M" : "L"} ${point.x + offsetX} ${point.y + offsetY}`,
            )
            .join(" ");
          const highlighterStyle = `stroke="${element.style.stroke}" stroke-width="${element.style.strokeWidth || 8}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${element.opacity || 0.3}" style="mix-blend-mode: multiply"`;
          return `<path d="${pathData}" ${highlighterStyle}/>`;
        }
        break;

      case "rectangle":
        return `<rect x="${element.x + offsetX}" y="${element.y + offsetY}" width="${element.width || 100}" height="${element.height || 100}" ${style}/>`;

      case "ellipse":
        const cx = element.x + (element.width || 100) / 2 + offsetX;
        const cy = element.y + (element.height || 100) / 2 + offsetY;
        const rx = (element.width || 100) / 2;
        const ry = (element.height || 100) / 2;
        return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${style}/>`;

      case "line":
        if (element.points && element.points.length >= 2) {
          const [start, end] = element.points;
          return `<line x1="${start.x + offsetX}" y1="${start.y + offsetY}" x2="${end.x + offsetX}" y2="${end.y + offsetY}" ${style}/>`;
        }
        break;

      case "arrow":
        if (element.points && element.points.length >= 2) {
          const [start, end] = element.points;
          const headLength = 15;
          const angle = Math.atan2(end.y - start.y, end.x - start.x);

          // Main line
          let svg = `<line x1="${start.x + offsetX}" y1="${start.y + offsetY}" x2="${end.x + offsetX}" y2="${end.y + offsetY}" ${style}/>`;

          // Arrowhead lines
          const arrowX1 = end.x - headLength * Math.cos(angle - Math.PI / 6);
          const arrowY1 = end.y - headLength * Math.sin(angle - Math.PI / 6);
          const arrowX2 = end.x - headLength * Math.cos(angle + Math.PI / 6);
          const arrowY2 = end.y - headLength * Math.sin(angle + Math.PI / 6);

          svg += `<line x1="${end.x + offsetX}" y1="${end.y + offsetY}" x2="${arrowX1 + offsetX}" y2="${arrowY1 + offsetY}" ${style}/>`;
          svg += `<line x1="${end.x + offsetX}" y1="${end.y + offsetY}" x2="${arrowX2 + offsetX}" y2="${arrowY2 + offsetY}" ${style}/>`;

          return svg;
        }
        break;

      case "text":
        const fontSize = element.style.fontSize || 16;
        const fontFamily = element.style.fontFamily || "Arial";
        let fontWeight = element.bold ? "bold" : "normal";
        let fontStyle = element.italic ? "italic" : "normal";
        let textDecoration = element.underline ? "underline" : "none";

        return `<text x="${element.x + offsetX}" y="${element.y + offsetY + fontSize}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" text-decoration="${textDecoration}" fill="${element.style.stroke}" stroke="none">${element.text || ""}</text>`;
    }

    return "";
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      toast({
        title: "Invalid File Type",
        description: "Please select a JSON file.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the structure
      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error(
          "Invalid file format: missing or invalid elements array",
        );
      }

      // Load the project
      dispatch({
        type: "LOAD_PROJECT",
        elements: data.elements,
        layers: data.layers || [],
        viewTransform: data.viewTransform,
      });

      // Restore brush settings if available
      if (data.brushSettings) {
        const settings = data.brushSettings;
        if (settings.brushColor) dispatch({ type: "SET_BRUSH_COLOR", color: settings.brushColor });
        if (settings.brushSize) dispatch({ type: "SET_BRUSH_SIZE", size: settings.brushSize });
        if (settings.fillColor) dispatch({ type: "SET_FILL_COLOR", color: settings.fillColor });
        if (settings.highlighterColor) dispatch({ type: "SET_HIGHLIGHTER_COLOR", color: settings.highlighterColor });
        if (settings.highlighterOpacity !== undefined) dispatch({ type: "SET_HIGHLIGHTER_OPACITY", opacity: settings.highlighterOpacity });
        if (settings.roughness !== undefined) dispatch({ type: "SET_ROUGHNESS", roughness: settings.roughness });
        if (settings.backgroundPattern) dispatch({ type: "SET_BACKGROUND_PATTERN", pattern: settings.backgroundPattern });

        // Restore text style
        if (settings.textStyle) {
          const textStyle = settings.textStyle;
          if (textStyle.fontSize) dispatch({ type: "SET_TEXT_FONT_SIZE", fontSize: textStyle.fontSize });
          if (textStyle.fontFamily) dispatch({ type: "SET_TEXT_FONT_FAMILY", fontFamily: textStyle.fontFamily });
          if (textStyle.bold !== undefined) dispatch({ type: "SET_TEXT_BOLD", bold: textStyle.bold });
          if (textStyle.italic !== undefined) dispatch({ type: "SET_TEXT_ITALIC", italic: textStyle.italic });
          if (textStyle.underline !== undefined) dispatch({ type: "SET_TEXT_UNDERLINE", underline: textStyle.underline });
        }

        // Restore line style
        if (settings.lineStyle) {
          const lineStyle = settings.lineStyle;
          if (lineStyle.type) dispatch({ type: "SET_LINE_STYLE_TYPE", lineType: lineStyle.type });
          if (lineStyle.intensity !== undefined) dispatch({ type: "SET_LINE_STYLE_INTENSITY", intensity: lineStyle.intensity });
          if (lineStyle.opacity !== undefined) dispatch({ type: "SET_LINE_STYLE_OPACITY", opacity: lineStyle.opacity });
        }
      }

      toast({
        title: "Import Complete",
        description: `Loaded ${data.elements.length} elements successfully.`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description:
          "Failed to load the project file. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset the input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const formatOptions = [
    { value: "png", label: "PNG Image", icon: Image },
    { value: "svg", label: "SVG Vector", icon: FileText },
    { value: "json", label: "JSON Data", icon: FileText },
    { value: "mp4", label: "MP4 Video", icon: Video },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import / Export Drawing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select
              value={options.format}
              onValueChange={(value: ExportFormat) =>
                setOptions((prev) => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  return (
                    <SelectItem key={format.value} value={format.value}>
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{format.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {(options.format === "png" || options.format === "mp4") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select
                  value={options.resolution}
                  onValueChange={(value: any) =>
                    setOptions((prev) => ({ ...prev, resolution: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Background</Label>
                <Select
                  value={options.background}
                  onValueChange={(value: any) =>
                    setOptions((prev) => ({ ...prev, background: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transparent">Transparent</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isExporting && (
            <div className="space-y-2">
              <Label>Export Progress</Label>
              <Progress value={exportProgress} className="w-full" />
              <div className="text-sm text-muted-foreground text-center">
                {exportProgress}% complete
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || drawingState.elements.length === 0}
            >
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
