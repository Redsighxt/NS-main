import React, { createContext, useContext, useReducer, ReactNode } from "react";

export type TextInputMode = "keyboard" | "stylus";

export interface TextToolState {
  // Mode settings
  inputMode: TextInputMode;

  // Font settings
  fontSize: number;
  fontFamily: string;
  customFonts: string[]; // List of imported custom fonts

  // Color settings
  useAutomaticColor: boolean; // If true, uses pencil tool color
  textColor: string;

  // Keyboard mode settings
  cursorPosition: { x: number; y: number } | null;
  isTyping: boolean;
  currentText: string;
  cursorBlinking: boolean;

  // Stylus mode settings
  inputBoxOpacity: number; // 0-100
  inputBoxColor: string;
  inputBoxSize: { width: number; height: number }; // in pixels (3 inches x 1 inch)
  inputBoxPosition: { x: number; y: number } | null;
  isInputBoxVisible: boolean;
  stylusText: string;
  wordQueue: string[]; // Queue of completed words waiting to be placed
  wordSpacing: number; // 0.1-20, spacing multiplier between words
}

type TextToolAction =
  | { type: "SET_INPUT_MODE"; mode: TextInputMode }
  | { type: "SET_FONT_SIZE"; size: number }
  | { type: "SET_FONT_FAMILY"; family: string }
  | { type: "ADD_CUSTOM_FONT"; fontName: string }
  | { type: "REMOVE_CUSTOM_FONT"; fontName: string }
  | { type: "SET_USE_AUTOMATIC_COLOR"; useAutomatic: boolean }
  | { type: "SET_TEXT_COLOR"; color: string }
  | { type: "SET_CURSOR_POSITION"; position: { x: number; y: number } | null }
  | { type: "SET_IS_TYPING"; isTyping: boolean }
  | { type: "SET_CURRENT_TEXT"; text: string }
  | { type: "TOGGLE_CURSOR_BLINK" }
  | { type: "SET_INPUT_BOX_OPACITY"; opacity: number }
  | { type: "SET_INPUT_BOX_COLOR"; color: string }
  | {
      type: "SET_INPUT_BOX_POSITION";
      position: { x: number; y: number } | null;
    }
  | { type: "SET_INPUT_BOX_VISIBLE"; visible: boolean }
  | { type: "SET_WORD_SPACING"; spacing: number }
  | { type: "SET_STYLUS_TEXT"; text: string }
  | { type: "ADD_WORD_TO_QUEUE"; word: string }
  | { type: "REMOVE_WORD_FROM_QUEUE" }
  | { type: "CLEAR_WORD_QUEUE" }
  | { type: "COMPLETE_TEXT_INPUT" }
  | { type: "CANCEL_TEXT_INPUT" };

// Convert inches to pixels (assuming 96 DPI)
const INCH_TO_PX = 96;

const initialState: TextToolState = {
  inputMode: "stylus",
  fontSize: 16,
  fontFamily: "Arial, sans-serif",
  customFonts: [],
  useAutomaticColor: true,
  textColor: "#000000",
  cursorPosition: null,
  isTyping: false,
  currentText: "",
  cursorBlinking: false,
  inputBoxOpacity: 30,
  inputBoxColor: "#3b82f6", // Mild blue
  inputBoxSize: { width: 3 * INCH_TO_PX, height: 1 * INCH_TO_PX }, // 3" x 1"
  inputBoxPosition: null,
  isInputBoxVisible: false,
  stylusText: "",
  wordQueue: [],
  wordSpacing: 0.25, // Default to tight spacing
};

function textToolReducer(
  state: TextToolState,
  action: TextToolAction,
): TextToolState {
  switch (action.type) {
    case "SET_INPUT_MODE":
      return {
        ...state,
        inputMode: action.mode,
        // Reset mode-specific states when switching
        cursorPosition: null,
        isTyping: false,
        currentText: "",
        inputBoxPosition: null,
        isInputBoxVisible: false,
        stylusText: "",
        wordQueue: [],
      };

    case "SET_FONT_SIZE":
      return { ...state, fontSize: action.size };

    case "SET_FONT_FAMILY":
      return { ...state, fontFamily: action.family };

    case "ADD_CUSTOM_FONT":
      return {
        ...state,
        customFonts: [...state.customFonts, action.fontName],
      };

    case "REMOVE_CUSTOM_FONT":
      return {
        ...state,
        customFonts: state.customFonts.filter(
          (font) => font !== action.fontName,
        ),
      };

    case "SET_USE_AUTOMATIC_COLOR":
      return { ...state, useAutomaticColor: action.useAutomatic };

    case "SET_TEXT_COLOR":
      return { ...state, textColor: action.color };

    case "SET_CURSOR_POSITION":
      return { ...state, cursorPosition: action.position };

    case "SET_IS_TYPING":
      return { ...state, isTyping: action.isTyping };

    case "SET_CURRENT_TEXT":
      return { ...state, currentText: action.text };

    case "TOGGLE_CURSOR_BLINK":
      return { ...state, cursorBlinking: !state.cursorBlinking };

    case "SET_INPUT_BOX_OPACITY":
      return { ...state, inputBoxOpacity: action.opacity };

    case "SET_INPUT_BOX_COLOR":
      return { ...state, inputBoxColor: action.color };

    case "SET_INPUT_BOX_POSITION":
      return { ...state, inputBoxPosition: action.position };

    case "SET_INPUT_BOX_VISIBLE":
      return { ...state, isInputBoxVisible: action.visible };

    case "SET_WORD_SPACING":
      return { ...state, wordSpacing: action.spacing };

    case "SET_STYLUS_TEXT":
      return { ...state, stylusText: action.text };

    case "ADD_WORD_TO_QUEUE":
      return {
        ...state,
        wordQueue: [...state.wordQueue, action.word],
      };

    case "REMOVE_WORD_FROM_QUEUE":
      return {
        ...state,
        wordQueue: state.wordQueue.slice(1),
      };

    case "CLEAR_WORD_QUEUE":
      return { ...state, wordQueue: [] };

    case "COMPLETE_TEXT_INPUT":
      return {
        ...state,
        cursorPosition: null,
        isTyping: false,
        currentText: "",
        inputBoxPosition: null,
        isInputBoxVisible: false,
        stylusText: "",
        wordQueue: [],
      };

    case "CANCEL_TEXT_INPUT":
      return {
        ...state,
        cursorPosition: null,
        isTyping: false,
        currentText: "",
        inputBoxPosition: null,
        isInputBoxVisible: false,
        stylusText: "",
        wordQueue: [],
      };

    default:
      return state;
  }
}

interface TextToolContextType {
  state: TextToolState;
  dispatch: React.Dispatch<TextToolAction>;
}

const TextToolContext = createContext<TextToolContextType | undefined>(
  undefined,
);

export function TextToolProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(textToolReducer, initialState);

  return (
    <TextToolContext.Provider value={{ state, dispatch }}>
      {children}
    </TextToolContext.Provider>
  );
}

export function useTextTool() {
  const context = useContext(TextToolContext);
  if (context === undefined) {
    throw new Error("useTextTool must be used within a TextToolProvider");
  }
  return context;
}
