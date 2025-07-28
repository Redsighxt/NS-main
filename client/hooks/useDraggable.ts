import { useCallback, useEffect, useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  constrainToViewport?: boolean;
}

export function useDraggable({
  initialPosition = { x: 0, y: 0 },
  constrainToViewport = true,
}: UseDraggableOptions = {}) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement>(null);
  const dragStartPosition = useRef<Position>({ x: 0, y: 0 });

  const handleStart = useCallback(
    (
      clientX: number,
      clientY: number,
      isTouch: boolean = false,
      pointerType?: string,
    ) => {
      const rect = elementRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Allow dragging with mouse, touch, or stylus
      if (pointerType && pointerType === "stylus") {
        // Apple Pencil or other stylus input - allow dragging
      } else if (isTouch && pointerType !== "stylus") {
        // Regular touch - allow dragging
      }

      setIsDragging(true);
      setDragStart({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
      dragStartPosition.current = { ...position };
    },
    [position],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return; // Only left click

      event.preventDefault();
      event.stopPropagation();

      handleStart(event.clientX, event.clientY);
    },
    [handleStart],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length !== 1) return; // Only single touch

      event.preventDefault();
      event.stopPropagation();

      const touch = event.touches[0];
      // Detect Apple Pencil or stylus input
      const touchWithType = touch as Touch & {
        touchType?: string;
        pointerType?: string;
      };
      const pointerType =
        touchWithType.touchType === "stylus"
          ? "stylus"
          : touchWithType.pointerType || "touch";

      handleStart(touch.clientX, touch.clientY, true, pointerType);
    },
    [handleStart],
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;

      let newX = clientX - dragStart.x;
      let newY = clientY - dragStart.y;

      if (constrainToViewport && elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // More lenient constraint to allow smoother movement
        const margin = 20; // Allow some overflow for smoother dragging
        newX = Math.max(
          -rect.width + margin,
          Math.min(viewportWidth - margin, newX),
        );
        newY = Math.max(
          -rect.height + margin,
          Math.min(viewportHeight - margin, newY),
        );
      }

      setPosition({ x: newX, y: newY });
    },
    [isDragging, dragStart, constrainToViewport],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      handleMove(event.clientX, event.clientY);
    },
    [handleMove],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      event.preventDefault();
      const touch = event.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove],
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();
      handleEnd();
    },
    [handleEnd],
  );

  // Add pointer event handlers for better Apple Pencil support
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      // Only handle primary pointer (left mouse or first touch/stylus)
      if (!event.isPrimary) return;

      event.preventDefault();
      event.stopPropagation();

      handleStart(
        event.clientX,
        event.clientY,
        event.pointerType !== "mouse",
        event.pointerType,
      );
    },
    [handleStart],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!event.isPrimary) return;
      handleMove(event.clientX, event.clientY);
    },
    [handleMove],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!event.isPrimary) return;
      event.preventDefault();
      handleEnd();
    },
    [handleEnd],
  );

  // Handle mouse, touch, and pointer events
  useEffect(() => {
    if (isDragging) {
      // Use pointer events for better Apple Pencil support
      document.addEventListener("pointermove", handlePointerMove, {
        passive: false,
      });
      document.addEventListener("pointerup", handlePointerUp, {
        passive: false,
      });
      document.addEventListener("pointercancel", handlePointerUp, {
        passive: false,
      });

      // Fallback to mouse and touch events for older browsers
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd, { passive: false });
      document.addEventListener("touchcancel", handleTouchEnd, {
        passive: false,
      });

      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      document.body.style.touchAction = "none";

      return () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerUp);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("touchcancel", handleTouchEnd);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.body.style.touchAction = "";
      };
    }
  }, [
    isDragging,
    handlePointerMove,
    handlePointerUp,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // Reset position function
  const resetPosition = useCallback(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  return {
    elementRef,
    position,
    isDragging,
    handleMouseDown,
    handleTouchStart,
    handlePointerDown,
    resetPosition,
    setPosition,
  };
}
