import React, { useRef } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { Button } from "../ui/button";
import { Upload } from "lucide-react";
import { toast } from "../ui/use-toast";

export function ImportButton() {
  const { dispatch } = useDrawing();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      }

      toast({
        title: "Import Complete",
        description: `Loaded ${data.elements.length} elements successfully.`,
      });
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description:
          "Failed to load the project file. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      // Reset the input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        <span>Import</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </>
  );
}
