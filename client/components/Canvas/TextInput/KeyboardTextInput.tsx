import React, { useEffect, useRef, useState } from "react";
import { useTextTool } from "../../../contexts/TextToolContext";
import { useDrawing } from "../../../contexts/DrawingContext";

interface KeyboardTextInputProps {
  onComplete: (text: string, position: { x: number; y: number }) => void;
  onCancel: () => void;
}

export function KeyboardTextInput({
  onComplete,
  onCancel,
}: KeyboardTextInputProps) {
  const { state: textState, dispatch: textDispatch } = useTextTool();
  const { state: drawingState } = useDrawing();
  const [currentText, setCurrentText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Blink cursor every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Focus input when cursor is positioned
  useEffect(() => {
    if (textState.cursorPosition && inputRef.current) {
      inputRef.current.focus();
    }
  }, [textState.cursorPosition]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textState.cursorPosition) return;

      if (e.key === "Enter") {
        if (currentText.trim()) {
          onComplete(currentText, textState.cursorPosition);
          setCurrentText("");
          textDispatch({ type: "COMPLETE_TEXT_INPUT" });
        }
      } else if (e.key === "Escape") {
        onCancel();
        setCurrentText("");
        textDispatch({ type: "CANCEL_TEXT_INPUT" });
      } else if (e.key === "Backspace") {
        setCurrentText((prev) => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        setCurrentText((prev) => prev + e.key);
      }
    };

    if (textState.cursorPosition) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    textState.cursorPosition,
    currentText,
    onComplete,
    onCancel,
    textDispatch,
  ]);

  if (!textState.cursorPosition) return null;

  // Get effective text color
  const effectiveTextColor = textState.useAutomaticColor
    ? drawingState.brushColor
    : textState.textColor;

  return (
    <>
      {/* Hidden input for mobile keyboard */}
      <input
        ref={inputRef}
        type="text"
        value={currentText}
        onChange={(e) => setCurrentText(e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          opacity: 0,
          pointerEvents: "none",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (currentText.trim()) {
              onComplete(currentText, textState.cursorPosition!);
              setCurrentText("");
              textDispatch({ type: "COMPLETE_TEXT_INPUT" });
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
            setCurrentText("");
            textDispatch({ type: "CANCEL_TEXT_INPUT" });
          }
        }}
      />

      {/* Text display on canvas */}
      <div
        style={{
          position: "absolute",
          left: `${textState.cursorPosition.x}px`,
          top: `${textState.cursorPosition.y}px`,
          fontSize: `${textState.fontSize}px`,
          fontFamily: textState.fontFamily,
          color: effectiveTextColor,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
        }}
      >
        {currentText}
        {/* Blinking cursor */}
        <span
          style={{
            display: "inline-block",
            width: "2px",
            height: `${textState.fontSize}px`,
            backgroundColor: effectiveTextColor,
            marginLeft: "1px",
            opacity: cursorVisible ? 1 : 0,
            transition: "opacity 0.1s",
          }}
        />
      </div>
    </>
  );
}
