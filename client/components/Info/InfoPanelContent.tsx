import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Keyboard, Mouse, Zap, Info } from "lucide-react";

export function InfoPanelContent() {
  const keyboardShortcuts = [
    { keys: ["Del", "Backspace"], action: "Delete selected elements" },
    { keys: ["Escape"], action: "Deselect all elements" },
    { keys: ["Ctrl", "A"], action: "Select all elements" },
    { keys: ["Ctrl", "D"], action: "Deselect all elements" },
    { keys: ["Ctrl", "C"], action: "Copy selected elements" },
    { keys: ["Ctrl", "V"], action: "Paste elements" },
    { keys: ["Ctrl", "Z"], action: "Undo" },
    { keys: ["Ctrl", "Y"], action: "Redo" },
    { keys: ["Ctrl", "Shift", "Z"], action: "Redo (alternative)" },
    { keys: ["Ctrl", "+"], action: "Zoom in" },
    { keys: ["Ctrl", "-"], action: "Zoom out" },
    { keys: ["Ctrl", "0"], action: "Reset zoom" },
  ];

  const mouseControls = [
    { action: "Mouse Wheel", description: "Zoom in/out" },
    { action: "Alt + Click & Drag", description: "Pan canvas" },
    { action: "Middle Mouse + Drag", description: "Pan canvas" },
    { action: "Hand Tool + Drag", description: "Pan canvas" },
    { action: "Click", description: "Select/Draw (depends on tool)" },
    { action: "Ctrl + Click", description: "Multi-select elements" },
    { action: "Drag", description: "Move selected elements" },
  ];

  const toolsInfo = [
    { name: "Select", description: "Select and move elements" },
    { name: "Hand", description: "Pan around the canvas" },
    { name: "Pencil", description: "Draw freehand paths" },
    { name: "Rectangle", description: "Draw rectangles" },
    { name: "Ellipse", description: "Draw ellipses/circles" },
    { name: "Line", description: "Draw straight lines" },
    { name: "Arrow", description: "Draw arrows" },
    { name: "Text", description: "Add text elements" },
    { name: "Lasso", description: "Freehand selection" },
  ];

  return (
    <div className="space-y-6">
      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </CardTitle>
          <CardDescription>
            Speed up your workflow with these shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keyboardShortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <React.Fragment key={keyIndex}>
                      <Badge variant="outline" className="font-mono text-xs">
                        {key}
                      </Badge>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="text-muted-foreground mx-1">+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground flex-1 ml-3">
                  {shortcut.action}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Mouse Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mouse className="w-5 h-5" />
            Mouse Controls
          </CardTitle>
          <CardDescription>Mouse and trackpad interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mouseControls.map((control, index) => (
              <div key={index} className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs min-w-fit">
                  {control.action}
                </Badge>
                <span className="text-sm text-muted-foreground flex-1 ml-3">
                  {control.description}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Tools Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Drawing Tools
          </CardTitle>
          <CardDescription>Available tools and their functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {toolsInfo.map((tool, index) => (
              <div key={index} className="flex items-center justify-between">
                <Badge variant="default" className="text-xs min-w-fit">
                  {tool.name}
                </Badge>
                <span className="text-sm text-muted-foreground flex-1 ml-3">
                  {tool.description}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Tips & Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Tips & Features
          </CardTitle>
          <CardDescription>Get the most out of Drawing Studio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong>Element Resizing:</strong> Select rectangles or ellipses
              to see resize handles around them
            </div>
            <div>
              <strong>Layers:</strong> Organize your drawing with multiple
              layers that can be toggled on/off
            </div>
            <div>
              <strong>Animation Recording:</strong> Record your drawing process
              and play it back
            </div>
            <div>
              <strong>Export Options:</strong> Export as PNG, SVG, or JSON for
              different use cases
            </div>
            <div>
              <strong>Canvas Modes:</strong> Switch between infinite canvas and
              fixed page mode
            </div>
            <div>
              <strong>Dark/Light Mode:</strong> Toggle theme in the top-right
              corner
            </div>
            <div>
              <strong>Background Patterns:</strong> Choose from various
              background colors and patterns
            </div>
            <div>
              <strong>Grid & Rulers:</strong> Enable grid in infinite mode or
              ruled lines in page mode
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
