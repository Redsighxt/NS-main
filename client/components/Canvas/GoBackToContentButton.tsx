import React, { useState, useEffect } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { Button } from "../ui/button";
import { Home, ArrowLeft } from "lucide-react";

export function GoBackToContentButton() {
  // Disabled as requested by user
  return null;

  const { state, dispatch } = useDrawing();
  const { state: canvasSettings } = useCanvasSettings();
  const [showButton, setShowButton] = useState(false);
  const [lastContentCenter, setLastContentCenter] = useState({ x: 0, y: 0 });

  // Calculate content bounds and center
  useEffect(() => {
    if (state.elements.length === 0) {
      setShowButton(false);
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let hasValidElements = false;

    state.elements.forEach((element) => {
      if (element.points && element.points.length > 0) {
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
          hasValidElements = true;
        });
      } else {
        const width = element.width || 100;
        const height = element.height || 100;
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + width);
        maxY = Math.max(maxY, element.y + height);
        hasValidElements = true;
      }
    });

    if (!hasValidElements) {
      setShowButton(false);
      return;
    }

    const contentCenter = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };

    setLastContentCenter(contentCenter);

    // Calculate current viewport center in world coordinates
    const viewportCenter = {
      x:
        -state.viewTransform.x / state.viewTransform.scale +
        window.innerWidth / 2 / state.viewTransform.scale,
      y:
        -state.viewTransform.y / state.viewTransform.scale +
        window.innerHeight / 2 / state.viewTransform.scale,
    };

    // Show button if viewport center is far from content center
    const distance = Math.sqrt(
      Math.pow(viewportCenter.x - contentCenter.x, 2) +
        Math.pow(viewportCenter.y - contentCenter.y, 2),
    );

    // Show button if distance is more than 500 pixels in world coordinates
    const threshold = 500 / state.viewTransform.scale;
    setShowButton(distance > threshold);
  }, [state.elements, state.viewTransform]);

  const handleGoBackToContent = () => {
    if (state.elements.length === 0) return;

    // Center the viewport on the content
    const targetX =
      window.innerWidth / 2 - lastContentCenter.x * state.viewTransform.scale;
    const targetY =
      window.innerHeight / 2 - lastContentCenter.y * state.viewTransform.scale;

    dispatch({
      type: "SET_VIEW_TRANSFORM",
      transform: {
        ...state.viewTransform,
        x: targetX,
        y: targetY,
      },
    });
  };

  // Only show in infinite canvas mode
  if (canvasSettings.canvasMode !== "infinite") {
    return null;
  }

  if (!showButton) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Button
        onClick={handleGoBackToContent}
        className="flex items-center space-x-2 bg-primary/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 animate-pulse"
        size="sm"
      >
        <Home className="h-4 w-4" />
        <span>Go Back to Content</span>
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}
