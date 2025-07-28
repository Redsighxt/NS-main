import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useDrawing } from "./DrawingContext";
import { useCanvasSettings } from "./CanvasSettingsContext";
import { virtualPagesManager, VirtualPage } from "../lib/virtualPagesManager";
import type { DrawingElement } from "./DrawingContext";

interface VirtualPagesContextType {
  pages: VirtualPage[];
  currentActivePage: VirtualPage | null;
  originPage: VirtualPage;
  statistics: {
    totalPages: number;
    pagesWithElements: number;
    totalElements: number;
    originPageElements: number;
  };
  getPageForElement: (element: DrawingElement) => VirtualPage;
  getAnimationOrderedPages: () => VirtualPage[];
  refresh: () => void;
}

const VirtualPagesContext = createContext<VirtualPagesContextType | undefined>(
  undefined,
);

export function VirtualPagesProvider({ children }: { children: ReactNode }) {
  const { state: drawingState } = useDrawing();
  const { state: canvasSettings } = useCanvasSettings();
  const [pages, setPages] = useState<VirtualPage[]>([]);
  const [statistics, setStatistics] = useState({
    totalPages: 0,
    pagesWithElements: 0,
    totalElements: 0,
    originPageElements: 0,
  });

  // Refresh function to update state from manager
  const refresh = () => {
    setPages(virtualPagesManager.getAllPages());
    setStatistics(virtualPagesManager.getStatistics());
  };

  // Initialize and rebuild pages when elements change
  useEffect(() => {
    if (
      canvasSettings.canvasMode === "infinite" &&
      drawingState.elements.length > 0
    ) {
      virtualPagesManager.rebuildFromElements(drawingState.elements);
      refresh();
    }
  }, [drawingState.elements, canvasSettings.canvasMode]);

  // Refresh when canvas mode changes
  useEffect(() => {
    if (canvasSettings.canvasMode === "infinite") {
      refresh();
    }
  }, [canvasSettings.canvasMode]);

  // Auto-refresh only when needed, not on an interval to avoid build issues
  // Removed automatic refresh interval to prevent infinite loops during builds

  const contextValue: VirtualPagesContextType = {
    pages,
    currentActivePage: virtualPagesManager.getCurrentActivePage(),
    originPage: virtualPagesManager.getOriginPage(),
    statistics,
    getPageForElement: (element: DrawingElement) =>
      virtualPagesManager.findElementPage(element),
    getAnimationOrderedPages: () =>
      virtualPagesManager.getAnimationOrderedPages(),
    refresh,
  };

  return (
    <VirtualPagesContext.Provider value={contextValue}>
      {children}
    </VirtualPagesContext.Provider>
  );
}

export function useVirtualPages() {
  const context = useContext(VirtualPagesContext);
  if (context === undefined) {
    throw new Error(
      "useVirtualPages must be used within a VirtualPagesProvider",
    );
  }
  return context;
}
