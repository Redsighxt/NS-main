import { useCallback, useRef, useState, useEffect } from "react";
import { useStylusOnly } from "../contexts/StylusOnlyContext";

interface PalmRejectionSettings {
  enabled: boolean;
  sensitivity: number;
  timeout: number;
  mode: "conservative" | "balanced" | "aggressive";
  touchSize: number;
  stylusOnly: boolean;
  delayBeforeActivation: number;
  edgeRejection: boolean;
}

interface TouchInfo {
  id: number;
  x: number;
  y: number;
  radiusX?: number;
  radiusY?: number;
  force?: number;
  timestamp: number;
  pointerType: string;
}

const DEFAULT_SETTINGS: PalmRejectionSettings = {
  enabled: true,
  sensitivity: 7,
  timeout: 300,
  mode: "balanced",
  touchSize: 15,
  stylusOnly: false,
  delayBeforeActivation: 50,
  edgeRejection: true,
};

export function usePalmRejection() {
  const { state: stylusState } = useStylusOnly();
  const [settings, setSettings] = useState<PalmRejectionSettings>(() => {
    try {
      const stored = localStorage.getItem("palmRejectionSettings");
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Automatically disable palm rejection when in stylus modes
  useEffect(() => {
    if (stylusState.mode === "light" || stylusState.mode === "full") {
      setSettings((prev) => ({ ...prev, enabled: false }));
    }
  }, [stylusState.mode]);

  const activeTouches = useRef<Map<number, TouchInfo>>(new Map());
  const rejectedTouches = useRef<Set<number>>(new Set());
  const lastStylusTime = useRef<number>(0);
  const palmDetectionTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateSettings = useCallback(
    (newSettings: Partial<PalmRejectionSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        localStorage.setItem("palmRejectionSettings", JSON.stringify(updated));
        return updated;
      });
    },
    [],
  );

  const isEdgeTouch = useCallback(
    (x: number, y: number, element: HTMLElement): boolean => {
      if (!settings.edgeRejection) return false;

      const rect = element.getBoundingClientRect();
      const edgeThreshold = 50; // pixels from edge

      return (
        x < edgeThreshold ||
        y < edgeThreshold ||
        x > rect.width - edgeThreshold ||
        y > rect.height - edgeThreshold
      );
    },
    [settings.edgeRejection],
  );

  const calculateTouchSize = useCallback((touch: Touch): number => {
    // Use radiusX and radiusY if available (more accurate)
    const touchWithRadius = touch as Touch & {
      radiusX?: number;
      radiusY?: number;
    };

    if (touchWithRadius.radiusX && touchWithRadius.radiusY) {
      return Math.max(touchWithRadius.radiusX, touchWithRadius.radiusY) * 2;
    }

    // Fallback to force-based size estimation
    const force = (touch as any).force || 0.5;
    return force * 20; // Estimate size based on pressure
  }, []);

  const getSensitivityThreshold = useCallback((): number => {
    const baseSensitivity = settings.touchSize;
    const modeSensitivity = {
      conservative: 0.8,
      balanced: 1.0,
      aggressive: 1.2,
    }[settings.mode];

    return baseSensitivity * modeSensitivity * (settings.sensitivity / 10);
  }, [settings]);

  const isPalmTouch = useCallback(
    (touch: Touch, element: HTMLElement): boolean => {
      // Disable palm rejection when in stylus modes
      if (stylusState.mode === "light" || stylusState.mode === "full")
        return false;
      if (!settings.enabled) return false;

      const now = Date.now();
      const rect = element.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Check stylus-only mode
      if (settings.stylusOnly) {
        const touchType = (touch as any).touchType;
        return touchType !== "stylus";
      }

      // Check if we're within the activation delay after stylus use
      if (now - lastStylusTime.current < settings.delayBeforeActivation) {
        return false;
      }

      // Check edge rejection
      if (isEdgeTouch(x, y, element)) {
        return true;
      }

      // Check touch size
      const touchSize = calculateTouchSize(touch);
      const threshold = getSensitivityThreshold();

      if (touchSize > threshold) {
        return true;
      }

      // Check for multiple simultaneous touches (likely palm + stylus)
      const activeTouchCount = activeTouches.current.size;
      if (activeTouchCount > 1) {
        // If we have a stylus touch active, reject other touches
        for (const touchInfo of activeTouches.current.values()) {
          if (
            touchInfo.pointerType === "pen" ||
            touchInfo.pointerType === "stylus"
          ) {
            return true;
          }
        }
      }

      return false;
    },
    [
      stylusState.mode,
      settings,
      isEdgeTouch,
      calculateTouchSize,
      getSensitivityThreshold,
    ],
  );

  const shouldRejectTouch = useCallback(
    (event: TouchEvent | PointerEvent, element: HTMLElement): boolean => {
      // Disable palm rejection when in stylus modes
      if (stylusState.mode === "light" || stylusState.mode === "full")
        return false;
      if (!settings.enabled) return false;

      if (event instanceof PointerEvent) {
        const now = Date.now();

        // Track stylus usage
        if (event.pointerType === "pen" || event.pointerType === "stylus") {
          lastStylusTime.current = now;
          return false; // Never reject stylus
        }

        // In stylus-only mode, reject all non-stylus input
        if (
          settings.stylusOnly &&
          event.pointerType !== "pen" &&
          event.pointerType !== "stylus"
        ) {
          return true;
        }

        // Check edge rejection
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (isEdgeTouch(x, y, element)) {
          return true;
        }

        // Check touch size/pressure
        const pressure = event.pressure || 0.5;
        const width = event.width || pressure * 20;
        const threshold = getSensitivityThreshold();

        if (width > threshold) {
          return true;
        }

        // Check activation delay after stylus use
        if (now - lastStylusTime.current < settings.delayBeforeActivation) {
          return true;
        }

        return false;
      }

      // Handle TouchEvent
      if (event.touches.length === 0) return false;

      // Check each touch
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        if (isPalmTouch(touch, element)) {
          return true;
        }
      }

      return false;
    },
    [
      stylusState.mode,
      settings,
      isEdgeTouch,
      getSensitivityThreshold,
      isPalmTouch,
    ],
  );

  const onStylusStart = useCallback(() => {
    lastStylusTime.current = Date.now();

    // Clear palm detection timeout if stylus is being used
    if (palmDetectionTimeout.current) {
      clearTimeout(palmDetectionTimeout.current);
      palmDetectionTimeout.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (touchId: number, touchInfo: TouchInfo) => {
      activeTouches.current.set(touchId, touchInfo);

      if (
        touchInfo.pointerType === "pen" ||
        touchInfo.pointerType === "stylus"
      ) {
        onStylusStart();
      }
    },
    [onStylusStart],
  );

  const onTouchEnd = useCallback((touchId: number) => {
    activeTouches.current.delete(touchId);
    rejectedTouches.current.delete(touchId);
  }, []);

  const rejectTouch = useCallback(
    (touchId: number) => {
      rejectedTouches.current.add(touchId);

      // Set timeout to clear rejection
      if (palmDetectionTimeout.current) {
        clearTimeout(palmDetectionTimeout.current);
      }

      palmDetectionTimeout.current = setTimeout(() => {
        rejectedTouches.current.clear();
      }, settings.timeout);
    },
    [settings.timeout],
  );

  const isTouchRejected = useCallback((touchId: number): boolean => {
    return rejectedTouches.current.has(touchId);
  }, []);

  return {
    settings,
    updateSettings,
    shouldRejectTouch,
    onTouchStart,
    onTouchEnd,
    onStylusStart,
    rejectTouch,
    isTouchRejected,
    isPalmTouch,
  };
}
