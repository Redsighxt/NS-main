import React, { useState } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import {
  Shapes,
  Square,
  Circle,
  Triangle,
  Diamond,
  Hexagon,
  Pentagon,
  Star,
  Heart,
  Plus,
  Trash2,
  Palette,
  Settings2,
} from "lucide-react";
import { cn } from "../../lib/utils";

// Available shapes (some will be functional, some coming soon)
const commonShapes = [
  { id: "rectangle", icon: Square, name: "Rectangle", available: true },
  { id: "ellipse", icon: Circle, name: "Circle", available: true },
  { id: "diamond", icon: Diamond, name: "Diamond", available: true },
  { id: "triangle", icon: Triangle, name: "Triangle", available: false },
  { id: "hexagon", icon: Hexagon, name: "Hexagon", available: false },
  { id: "pentagon", icon: Pentagon, name: "Pentagon", available: false },
  { id: "star", icon: Star, name: "Star", available: false },
  { id: "heart", icon: Heart, name: "Heart", available: false },
];

export function ShapesPanel() {
  const { state } = useDrawing();
  const [selectedStyle, setSelectedStyle] = useState<"normal" | "rough">(
    "rough",
  );
  const [toolbarShapes, setToolbarShapes] = useState([
    "rectangle",
    "ellipse",
    "diamond",
  ]);

  const addToToolbar = (shapeId: string) => {
    if (!toolbarShapes.includes(shapeId) && toolbarShapes.length < 8) {
      setToolbarShapes([...toolbarShapes, shapeId]);
    }
  };

  const removeFromToolbar = (shapeId: string) => {
    setToolbarShapes(toolbarShapes.filter((id) => id !== shapeId));
  };

  return (
    <AnimatedFloatingPanel
      id="shapes"
      title="Shapes"
      icon={Shapes}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 460 : 900,
        y: 120,
      }}
      defaultSize={{ width: 400, height: 500 }}
    >
      <div className="space-y-4">
        {/* Style Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Shape Style</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedStyle === "normal" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStyle("normal")}
                className="flex flex-col space-y-1 h-auto py-3"
              >
                <Square className="h-5 w-5" strokeWidth={2} />
                <span className="text-xs">Normal</span>
              </Button>
              <Button
                variant={selectedStyle === "rough" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStyle("rough")}
                className="flex flex-col space-y-1 h-auto py-3"
              >
                <Square
                  className="h-5 w-5"
                  strokeWidth={1.5}
                  style={{ filter: "url(#rough)" }}
                />
                <span className="text-xs">Rough.js</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Toolbar Shapes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Settings2 className="h-4 w-4" />
                <span>Current Toolbar</span>
              </span>
              <Badge variant="secondary" className="text-xs">
                {toolbarShapes.length}/8
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {toolbarShapes.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {toolbarShapes.map((shapeId) => {
                  const shape = commonShapes.find((s) => s.id === shapeId);
                  if (!shape) return null;
                  const Icon = shape.icon;

                  return (
                    <div key={shapeId} className="relative group">
                      <div className="flex flex-col items-center space-y-1 p-2 border rounded-lg bg-muted/20">
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{shape.name}</span>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFromToolbar(shapeId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                No shapes in toolbar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Shapes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Shapes className="h-4 w-4" />
              <span>Available Shapes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="grid grid-cols-3 gap-2">
                {commonShapes.map((shape) => {
                  const Icon = shape.icon;
                  const isInToolbar = toolbarShapes.includes(shape.id);
                  const canAdd =
                    !isInToolbar && toolbarShapes.length < 8 && shape.available;

                  return (
                    <div key={shape.id} className="relative">
                      <Button
                        variant="outline"
                        className={cn(
                          "flex flex-col space-y-1 h-auto py-3 w-full",
                          isInToolbar && "opacity-50 cursor-not-allowed",
                          !shape.available && "opacity-30",
                        )}
                        disabled={isInToolbar || !shape.available}
                        onClick={() => canAdd && addToToolbar(shape.id)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{shape.name}</span>
                        {!shape.available && (
                          <Badge variant="outline" className="text-xs px-1">
                            Soon
                          </Badge>
                        )}
                      </Button>

                      {canAdd && (
                        <Button
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5"
                          onClick={() => addToToolbar(shape.id)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}

                      {isInToolbar && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Add More Shapes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Insert More Shapes</span>
              <Badge variant="outline" className="text-xs">
                Coming Soon
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full flex items-center space-x-2"
              disabled
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Shapes</span>
            </Button>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              Custom shape import will be available soon
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1 pt-2 border-t">
          <div>🎨 Choose between normal and rough.js styles</div>
          <div>🔧 Customize your toolbar with up to 8 shapes</div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
