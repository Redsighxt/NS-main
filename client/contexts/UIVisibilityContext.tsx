import React, { createContext, useContext, useState, ReactNode } from "react";

interface UIVisibilityContextType {
  isUIVisible: boolean;
  toggleUI: () => void;
  hideUI: () => void;
  showUI: () => void;
}

const UIVisibilityContext = createContext<UIVisibilityContextType | undefined>(
  undefined,
);

export function UIVisibilityProvider({ children }: { children: ReactNode }) {
  const [isUIVisible, setIsUIVisible] = useState(true);

  const toggleUI = () => setIsUIVisible((prev) => !prev);
  const hideUI = () => setIsUIVisible(false);
  const showUI = () => setIsUIVisible(true);

  return (
    <UIVisibilityContext.Provider
      value={{ isUIVisible, toggleUI, hideUI, showUI }}
    >
      {children}
    </UIVisibilityContext.Provider>
  );
}

export function useUIVisibility() {
  const context = useContext(UIVisibilityContext);
  if (context === undefined) {
    throw new Error(
      "useUIVisibility must be used within a UIVisibilityProvider",
    );
  }
  return context;
}
