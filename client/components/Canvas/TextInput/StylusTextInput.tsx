import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTextTool } from "../../../contexts/TextToolContext";
import { useDrawing } from "../../../contexts/DrawingContext";

interface StylusTextInputProps {
  onComplete: (text: string, position: { x: number; y: number }) => void;
  onCancel: () => void;
}

export function StylusTextInput({
  onComplete,
  onCancel,
}: StylusTextInputProps) {
  const { state: textState, dispatch: textDispatch } = useTextTool();
  const { state: drawingState } = useDrawing();
  const [currentInput, setCurrentInput] = useState("");
  const [placedWords, setPlacedWords] = useState<
    Array<{ text: string; x: number; y: number }>
  >([]);
  const [inputBoxPosition, setInputBoxPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [textBaselinePosition, setTextBaselinePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Set input box position when stylus position is set
  useEffect(() => {
    if (textState.inputBoxPosition) {
      setInputBoxPosition(textState.inputBoxPosition);
      // Always reset text baseline to new position when user clicks somewhere new
      setTextBaselinePosition(textState.inputBoxPosition);
      // Clear any existing content to start fresh
      setCurrentInput("");
      setPlacedWords([]);
    }
  }, [textState.inputBoxPosition]);

  // Cleanup when component unmounts or tool changes
  useEffect(() => {
    return () => {
      // Reset all state when component unmounts
      setCurrentInput("");
      setPlacedWords([]);
      setInputBoxPosition(null);
      setTextBaselinePosition(null);
    };
  }, []);

  // Focus input when box is positioned
  useEffect(() => {
    const activePos = inputBoxPosition || textState.inputBoxPosition;
    if (activePos && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputBoxPosition, textState.inputBoxPosition]);

  // Get effective text color
  const effectiveTextColor = textState.useAutomaticColor
    ? drawingState.brushColor
    : textState.textColor;

  // Handle spacebar word completion
  const handleWordCompletion = useCallback(
    (word: string) => {
      if (word.trim() && textBaselinePosition) {
        // Use consistent text baseline position for word placement
        onComplete(word.trim(), textBaselinePosition);

        // Visual feedback: show the word being added at text baseline
        const wordElement = document.createElement("div");
        wordElement.textContent = word.trim();
        wordElement.style.cssText = `
        position: fixed;
        left: ${textBaselinePosition.x}px;
        top: ${textBaselinePosition.y - 30}px;
        font-size: ${textState.fontSize * 0.8}px;
        font-family: ${textState.fontFamily};
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        z-index: 10000;
        pointer-events: none;
        animation: fadeOut 1s ease-out;
      `;
        document.body.appendChild(wordElement);

        // Remove feedback element after animation
        setTimeout(() => {
          if (document.body.contains(wordElement)) {
            document.body.removeChild(wordElement);
          }
        }, 1000);

        // Calculate precise word spacing in WORLD COORDINATES
        let worldSpaceWidth;
        try {
          // Create a temporary canvas to measure exact text width
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Use the world coordinate font size (same as what will be stored in the element)
            const worldFontSize =
              textState.fontSize / drawingState.viewTransform.scale;
            ctx.font = `${worldFontSize}px ${textState.fontFamily}`;
            const actualWordWidth = ctx.measureText(word.trim()).width;
            const singleSpaceWidth = ctx.measureText(" ").width;

            // Apply the word spacing multiplier - key fix: much smaller spacing for minimal values
            // For very small values like 0.1, we want much tighter spacing
            let adjustedSpacing;
            if (textState.wordSpacing < 1) {
              // For sub-1 values, use a more aggressive reduction
              adjustedSpacing = singleSpaceWidth * textState.wordSpacing * 0.5;
            } else {
              // For normal values, use the regular calculation
              adjustedSpacing = singleSpaceWidth * textState.wordSpacing;
            }

            worldSpaceWidth = actualWordWidth + adjustedSpacing;
          } else {
            throw new Error("Canvas context not available");
          }
        } catch (error) {
          // Fallback calculation in world coordinates
          const worldFontSize =
            textState.fontSize / drawingState.viewTransform.scale;
          const avgCharWidth = worldFontSize * 0.6;
          const baseWordWidth = word.length * avgCharWidth;

          let spaceWidth;
          if (textState.wordSpacing < 1) {
            spaceWidth = worldFontSize * 0.2 * textState.wordSpacing; // Much smaller for minimal spacing
          } else {
            spaceWidth = worldFontSize * 0.4 * textState.wordSpacing;
          }

          worldSpaceWidth = baseWordWidth + spaceWidth;
        }

        // Update text baseline position for next word in WORLD COORDINATES
        // Since textBaselinePosition is in screen coordinates, we need to:
        // 1. Convert to world coordinates
        // 2. Add the spacing
        // 3. Convert back to screen coordinates

        // Get current canvas info for coordinate conversion
        const canvasRect = document
          .querySelector("canvas")
          ?.getBoundingClientRect();
        if (canvasRect) {
          // Convert screen baseline to world coordinates
          const worldBaseline = {
            x:
              (textBaselinePosition.x - drawingState.viewTransform.x) /
              drawingState.viewTransform.scale,
            y:
              (textBaselinePosition.y - drawingState.viewTransform.y) /
              drawingState.viewTransform.scale,
          };

          // Add spacing in world coordinates
          const newWorldX = worldBaseline.x + worldSpaceWidth;

          // Convert back to screen coordinates for input box positioning
          const newScreenX =
            newWorldX * drawingState.viewTransform.scale +
            drawingState.viewTransform.x;
          const newTextPosition = { x: newScreenX, y: textBaselinePosition.y };

          // Move input box slightly ahead
          const inputBoxOffset = 20;
          const newInputPosition = {
            x: newScreenX + inputBoxOffset,
            y: textBaselinePosition.y,
          };

          // Update all positions
          setTextBaselinePosition(newTextPosition);
          setInputBoxPosition(newInputPosition);
          textDispatch({
            type: "SET_INPUT_BOX_POSITION",
            position: newInputPosition,
          });
        }

        // Clear current input for next word
        setCurrentInput("");
      }
    },
    [
      textBaselinePosition,
      textState,
      drawingState.viewTransform,
      onComplete,
      textDispatch,
    ],
  );

  // Direct word completion for immediate response
  const directWordCompletion = useCallback(
    (word: string) => {
      handleWordCompletion(word);
    },
    [handleWordCompletion],
  );

  // Handle input changes for spacebar detection
  useEffect(() => {
    if (currentInput.includes(" ")) {
      const words = currentInput.split(" ");
      const completedWord = words[0];
      const remainingText = words.slice(1).join(" ");

      if (completedWord.trim()) {
        try {
          directWordCompletion(completedWord);
        } catch (error) {
          console.error("Error completing word:", error);
        }
      }

      setCurrentInput(remainingText);
    }
  }, [currentInput, directWordCompletion]);

  const resetInput = useCallback(() => {
    setCurrentInput("");
    setPlacedWords([]);
    setInputBoxPosition(null);
    setTextBaselinePosition(null);
    textDispatch({ type: "COMPLETE_TEXT_INPUT" });
  }, [textDispatch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textBaselinePosition) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // Complete current word and finish session
        if (currentInput.trim()) {
          handleWordCompletion(currentInput);
        }
        onCancel(); // Close the input session
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        resetInput();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    textBaselinePosition,
    currentInput,
    handleWordCompletion,
    onCancel,
    resetInput,
  ]);

  if (!inputBoxPosition && !textState.inputBoxPosition) return null;

  // Use context position if local position is not set
  const activePosition = inputBoxPosition || textState.inputBoxPosition;

  // Convert opacity percentage to hex
  const opacityHex = Math.round(textState.inputBoxOpacity * 2.55)
    .toString(16)
    .padStart(2, "0");

  return (
    <>
      {/* Placed words */}
      {placedWords.map((word, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `${word.x}px`,
            top: `${word.y}px`,
            fontSize: `${textState.fontSize}px`,
            fontFamily: textState.fontFamily,
            color: effectiveTextColor,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {word.text}
        </div>
      ))}

      {/* Input box */}
      <div
        style={{
          position: "absolute",
          left: `${activePosition.x}px`,
          top: `${activePosition.y}px`,
          width: `${textState.inputBoxSize.width}px`,
          height: `${textState.inputBoxSize.height}px`,
          backgroundColor: `${textState.inputBoxColor}${opacityHex}`,
          border: `2px solid ${textState.inputBoxColor}`,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          padding: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          backdropFilter: "blur(4px)",
        }}
      >
        <textarea
          ref={inputRef}
          value={currentInput}
          onChange={(e) => {
            const newValue = e.target.value;
            setCurrentInput(newValue);

            // Auto-detect completed words from ink-to-text conversion
            // If text suddenly appears (likely from handwriting recognition)
            if (newValue.length > currentInput.length + 1) {
              // Detect if a complete word was added (common with ink-to-text)
              const words = newValue.split(/\s+/).filter((word) => word.trim());
              if (words.length > 0) {
                const lastWord = words[words.length - 1];
                const otherWords = words.slice(0, -1);

                // Auto-complete previous words
                for (const word of otherWords) {
                  if (word.trim()) {
                    handleWordCompletion(word);
                  }
                }

                // Set remaining text
                setCurrentInput(lastWord || "");
              }
            }
          }}
          placeholder="Write with stylus or type..."
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "transparent",
            outline: "none",
            resize: "none",
            fontSize: `${textState.fontSize}px`,
            fontFamily: textState.fontFamily,
            color: effectiveTextColor,
            lineHeight: "1.2",
            touchAction: "manipulation", // Optimize for touch input
          }}
          onBlur={() => {
            // Re-focus after a short delay to keep input active
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 100);
          }}
        />
      </div>

      {/* Instructions */}
      <div
        style={{
          position: "absolute",
          left: `${activePosition.x}px`,
          top: `${activePosition.y + textState.inputBoxSize.height + 10}px`,
          fontSize: "12px",
          color: "#666",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "4px 8px",
          borderRadius: "4px",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        Spacebar: Add word to canvas • Enter: Complete session • Escape: Cancel
      </div>
    </>
  );
}
