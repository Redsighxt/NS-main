import { useCallback, useEffect, useRef } from "react";
import {
  useCanvasSettings,
  CameraKeyframe,
} from "../contexts/CanvasSettingsContext";
import { useDrawing } from "../contexts/DrawingContext";
import { useAnimation } from "../contexts/AnimationContext";

// Linear interpolation function
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Smooth step interpolation for more natural camera movement
function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Interpolate between two camera keyframes
function interpolateCameraKeyframes(
  keyframe1: CameraKeyframe,
  keyframe2: CameraKeyframe,
  t: number,
): { x: number; y: number; scale: number } {
  const smoothT = smoothStep(t);

  return {
    x: lerp(keyframe1.x, keyframe2.x, smoothT),
    y: lerp(keyframe1.y, keyframe2.y, smoothT),
    scale: lerp(keyframe1.scale, keyframe2.scale, smoothT),
  };
}

export function useCameraPathAnimation() {
  const { state: canvasSettings, dispatch: canvasDispatch } =
    useCanvasSettings();
  const { dispatch: drawingDispatch } = useDrawing();
  const { state: animationState } = useAnimation();
  const animationFrameRef = useRef<number>();

  // Get camera position at a specific time
  const getCameraPositionAtTime = useCallback(
    (timeInSeconds: number): { x: number; y: number; scale: number } | null => {
      if (
        canvasSettings.cameraTrackingMode !== "manual" ||
        !canvasSettings.cameraPath ||
        canvasSettings.cameraPath.keyframes.length < 2
      ) {
        return null;
      }

      const keyframes = canvasSettings.cameraPath.keyframes;

      // If time is before first keyframe
      if (timeInSeconds <= keyframes[0].timestamp) {
        return {
          x: keyframes[0].x,
          y: keyframes[0].y,
          scale: keyframes[0].scale,
        };
      }

      // If time is after last keyframe
      if (timeInSeconds >= keyframes[keyframes.length - 1].timestamp) {
        const lastFrame = keyframes[keyframes.length - 1];
        return {
          x: lastFrame.x,
          y: lastFrame.y,
          scale: lastFrame.scale,
        };
      }

      // Find the two keyframes to interpolate between
      for (let i = 0; i < keyframes.length - 1; i++) {
        const currentFrame = keyframes[i];
        const nextFrame = keyframes[i + 1];

        if (
          timeInSeconds >= currentFrame.timestamp &&
          timeInSeconds <= nextFrame.timestamp
        ) {
          const duration = nextFrame.timestamp - currentFrame.timestamp;
          const progress =
            duration > 0
              ? (timeInSeconds - currentFrame.timestamp) / duration
              : 0;

          return interpolateCameraKeyframes(currentFrame, nextFrame, progress);
        }
      }

      return null;
    },
    [canvasSettings.cameraTrackingMode, canvasSettings.cameraPath],
  );

  // Update camera position during animation playback
  const updateCameraForPlayback = useCallback(() => {
    if (
      !animationState.isPlaying ||
      canvasSettings.cameraTrackingMode !== "manual"
    ) {
      return;
    }

    // Simple animation system doesn't track currentTime - camera tracking disabled
    const currentTimeInSeconds = 0;
    const cameraPosition = getCameraPositionAtTime(currentTimeInSeconds);

    if (cameraPosition) {
      // Convert camera position to view transform
      // Camera position represents where the camera is looking at,
      // so we need to invert it for the view transform
      const canvas = document.querySelector("canvas");
      if (canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const viewTransform = {
          x: centerX - cameraPosition.x * cameraPosition.scale,
          y: centerY - cameraPosition.y * cameraPosition.scale,
          scale: cameraPosition.scale,
        };

        drawingDispatch({
          type: "SET_VIEW_TRANSFORM",
          transform: viewTransform,
        });
        canvasDispatch({
          type: "SET_CAMERA_POSITION",
          position: cameraPosition,
        });
      }
    }

    // Schedule next update
    animationFrameRef.current = requestAnimationFrame(updateCameraForPlayback);
  }, [
    animationState.isPlaying,
    canvasSettings.cameraTrackingMode,
    getCameraPositionAtTime,
    drawingDispatch,
    canvasDispatch,
  ]);

  // Start/stop camera animation based on playback state
  useEffect(() => {
    if (
      animationState.isPlaying &&
      canvasSettings.cameraTrackingMode === "manual" &&
      canvasSettings.cameraPath
    ) {
      updateCameraForPlayback();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    animationState.isPlaying,
    canvasSettings.cameraTrackingMode,
    updateCameraForPlayback,
  ]);

  return {
    getCameraPositionAtTime,
    isAnimatingCamera:
      animationState.isPlaying &&
      canvasSettings.cameraTrackingMode === "manual",
  };
}
