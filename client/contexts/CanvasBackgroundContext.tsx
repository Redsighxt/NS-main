import React, { createContext, useContext, useState, ReactNode } from "react";

export interface CanvasBackground {
  id: string;
  name: string;
  color: string;
  pattern?: "dots" | "grid" | "lines" | "none";
}

const canvasBackgrounds: CanvasBackground[] = [
  { id: "white", name: "White", color: "#ffffff", pattern: "none" },
  { id: "light-gray", name: "Light Gray", color: "#e5e7eb", pattern: "none" },
  { id: "cream", name: "Cream", color: "#fef3c7", pattern: "none" },
  { id: "light-blue", name: "Light Blue", color: "#dbeafe", pattern: "none" },
  { id: "light-green", name: "Light Green", color: "#dcfce7", pattern: "none" },
  {
    id: "light-purple",
    name: "Light Purple",
    color: "#e9d5ff",
    pattern: "none",
  },
  { id: "light-pink", name: "Light Pink", color: "#fce7f3", pattern: "none" },
  {
    id: "light-orange",
    name: "Light Orange",
    color: "#fed7aa",
    pattern: "none",
  },
  {
    id: "light-yellow",
    name: "Light Yellow",
    color: "#fef3c7",
    pattern: "none",
  },
  { id: "light-cyan", name: "Light Cyan", color: "#cffafe", pattern: "none" },
  { id: "dark", name: "Dark", color: "#0f0f0f", pattern: "none" },
  { id: "dark-blue", name: "Dark Blue", color: "#0c1629", pattern: "none" },
  { id: "dark-gray", name: "Dark Gray", color: "#1f2937", pattern: "none" },
  { id: "dark-purple", name: "Dark Purple", color: "#1e1b4b", pattern: "none" },
  { id: "dark-green", name: "Dark Green", color: "#14532d", pattern: "none" },
  { id: "dark-red", name: "Dark Red", color: "#7f1d1d", pattern: "none" },
  { id: "charcoal", name: "Charcoal", color: "#374151", pattern: "none" },
  {
    id: "transparent",
    name: "Transparent",
    color: "transparent",
    pattern: "none",
  },
  {
    id: "white-dots",
    name: "White with Dots",
    color: "#ffffff",
    pattern: "dots",
  },
  {
    id: "white-grid",
    name: "White with Grid",
    color: "#ffffff",
    pattern: "grid",
  },
  {
    id: "white-lines",
    name: "White with Lines",
    color: "#ffffff",
    pattern: "lines",
  },
  {
    id: "dark-dots",
    name: "Dark with Dots",
    color: "#0f0f0f",
    pattern: "dots",
  },
  {
    id: "dark-grid",
    name: "Dark with Grid",
    color: "#0f0f0f",
    pattern: "grid",
  },
];

interface CanvasBackgroundContextType {
  currentBackground: CanvasBackground;
  backgrounds: CanvasBackground[];
  customBackgrounds: CanvasBackground[];
  setBackground: (background: CanvasBackground) => void;
  setBackgroundById: (id: string) => void;
  addCustomBackground: (color: string, name?: string) => void;
  removeCustomBackground: (id: string) => void;
}

const CanvasBackgroundContext = createContext<
  CanvasBackgroundContextType | undefined
>(undefined);

export function CanvasBackgroundProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [currentBackground, setCurrentBackground] = useState<CanvasBackground>(
    canvasBackgrounds[10], // Default to dark background (#0f0f0f) for dark mode
  );
  const [customBackgrounds, setCustomBackgrounds] = useState<
    CanvasBackground[]
  >([]);

  const setBackground = (background: CanvasBackground) => {
    setCurrentBackground(background);
    localStorage.setItem("canvas-background", JSON.stringify(background));
  };

  const setBackgroundById = (id: string) => {
    const allBackgrounds = [...canvasBackgrounds, ...customBackgrounds];
    const background = allBackgrounds.find((bg) => bg.id === id);
    if (background) {
      setBackground(background);
    }
  };

  const addCustomBackground = (color: string, name?: string) => {
    const customId = `custom-${Date.now()}`;
    const customName = name || `Custom ${customBackgrounds.length + 1}`;
    const newBackground: CanvasBackground = {
      id: customId,
      name: customName,
      color: color,
      pattern: "none",
    };

    const updatedCustom = [...customBackgrounds, newBackground];
    setCustomBackgrounds(updatedCustom);
    localStorage.setItem("custom-backgrounds", JSON.stringify(updatedCustom));
    setBackground(newBackground);
  };

  const removeCustomBackground = (id: string) => {
    const updatedCustom = customBackgrounds.filter((bg) => bg.id !== id);
    setCustomBackgrounds(updatedCustom);
    localStorage.setItem("custom-backgrounds", JSON.stringify(updatedCustom));

    // If we're removing the current background, switch to white
    if (currentBackground.id === id) {
      setBackground(canvasBackgrounds[0]);
    }
  };

  // Load saved background and custom backgrounds on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("canvas-background");
    const savedCustom = localStorage.getItem("custom-backgrounds");

    if (savedCustom) {
      try {
        const custom = JSON.parse(savedCustom);
        setCustomBackgrounds(custom);
      } catch (error) {
        console.error("Failed to load custom backgrounds:", error);
      }
    }

    if (saved) {
      try {
        const background = JSON.parse(saved);
        setCurrentBackground(background);
      } catch (error) {
        console.error("Failed to load saved canvas background:", error);
      }
    }
  }, []);

  return (
    <CanvasBackgroundContext.Provider
      value={{
        currentBackground,
        backgrounds: canvasBackgrounds,
        customBackgrounds,
        setBackground,
        setBackgroundById,
        addCustomBackground,
        removeCustomBackground,
      }}
    >
      {children}
    </CanvasBackgroundContext.Provider>
  );
}

export function useCanvasBackground() {
  const context = useContext(CanvasBackgroundContext);
  if (context === undefined) {
    throw new Error(
      "useCanvasBackground must be used within a CanvasBackgroundProvider",
    );
  }
  return context;
}
