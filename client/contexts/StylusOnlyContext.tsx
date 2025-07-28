import React, { createContext, useContext, useState, ReactNode } from "react";

type StylusMode = "off" | "light" | "full";

interface StylusOnlyState {
  mode: StylusMode;
}

interface StylusOnlyContextType {
  state: StylusOnlyState;
  setMode: (mode: StylusMode) => void;
  toggle: () => void;
}

const StylusOnlyContext = createContext<StylusOnlyContextType | undefined>(
  undefined,
);

interface StylusOnlyProviderProps {
  children: ReactNode;
}

export function StylusOnlyProvider({ children }: StylusOnlyProviderProps) {
  const [state, setState] = useState<StylusOnlyState>({
    mode: "off",
  });

  const setMode = (mode: StylusMode) => {
    setState((prev) => ({ ...prev, mode }));
    // Store in localStorage for persistence
    localStorage.setItem("stylusOnlyMode", mode);
  };

  const toggle = () => {
    // Cycle through: off -> light -> full -> off
    switch (state.mode) {
      case "off":
        setMode("light");
        break;
      case "light":
        setMode("full");
        break;
      case "full":
        setMode("off");
        break;
    }
  };

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem("stylusOnlyMode") as StylusMode;
    if (stored && ["off", "light", "full"].includes(stored)) {
      setState((prev) => ({ ...prev, mode: stored }));
    }
  }, []);

  return (
    <StylusOnlyContext.Provider value={{ state, setMode, toggle }}>
      {children}
    </StylusOnlyContext.Provider>
  );
}

export function useStylusOnly() {
  const context = useContext(StylusOnlyContext);
  if (context === undefined) {
    throw new Error("useStylusOnly must be used within a StylusOnlyProvider");
  }
  return context;
}
