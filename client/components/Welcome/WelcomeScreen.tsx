import React from "react";
import { useWelcome } from "../../contexts/WelcomeContext";

export function WelcomeScreen() {
  const { isWelcomeVisible } = useWelcome();

  if (!isWelcomeVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="text-center">
        <h1
          className="text-8xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 bg-clip-text text-transparent"
          style={{
            fontFamily: "Caveat, cursive",
            textShadow: "0 0 20px rgba(167, 139, 250, 0.3)",
          }}
        >
          RexSight Studio
        </h1>
        <p className="text-xl text-muted-foreground/80 font-light max-w-md mx-auto">
          Touch anywhere to start creating
        </p>
        <div className="mt-8 text-sm text-muted-foreground/60">
          Professional drawing & animation experience
        </div>
      </div>
    </div>
  );
}
