import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

interface WelcomeContextType {
  isWelcomeVisible: boolean;
  hideWelcome: () => void;
  showWelcome: () => void;
}

const WelcomeContext = createContext<WelcomeContextType | undefined>(undefined);

export function WelcomeProvider({ children }: { children: ReactNode }) {
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true);

  const hideWelcome = () => {
    setIsWelcomeVisible(false);
    localStorage.setItem("welcome-hidden", "true");
  };

  const showWelcome = () => {
    setIsWelcomeVisible(true);
    localStorage.removeItem("welcome-hidden");
  };

  // Always show welcome screen on page load/refresh
  useEffect(() => {
    setIsWelcomeVisible(true);
    localStorage.removeItem("welcome-hidden");
  }, []);

  // Hide welcome screen on any user interaction
  useEffect(() => {
    if (!isWelcomeVisible) return;

    const handleInteraction = () => {
      hideWelcome();
    };

    // Listen for various interaction events
    document.addEventListener("mousedown", handleInteraction);
    document.addEventListener("keydown", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);

    return () => {
      document.removeEventListener("mousedown", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [isWelcomeVisible]);

  return (
    <WelcomeContext.Provider
      value={{ isWelcomeVisible, hideWelcome, showWelcome }}
    >
      {children}
    </WelcomeContext.Provider>
  );
}

export function useWelcome() {
  const context = useContext(WelcomeContext);
  if (context === undefined) {
    throw new Error("useWelcome must be used within a WelcomeProvider");
  }
  return context;
}
