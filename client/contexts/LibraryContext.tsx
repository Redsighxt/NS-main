import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { useDrawing } from "./DrawingContext";
import { addLibraryComponentToCanvas } from "../lib/excalidrawRenderer";

// Excalidraw library component interface (based on official Excalidraw format)
export interface ExcalidrawLibraryComponent {
  id: string;
  status: "published" | "unpublished";
  created: number;
  name?: string;
  description?: string;
  tags?: string[];
  elements: ExcalidrawLibraryElement[];
  // For animation support
  animationData?: {
    duration?: number;
    delay?: number;
    easing?: string;
  };
}

export interface ExcalidrawLibraryElement {
  type: string;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  id: string;
  fillStyle:
    | "hachure"
    | "cross-hatch"
    | "solid"
    | "zigzag"
    | "zigzag-line"
    | "dots";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roughness: number;
  opacity: number;
  angle: number;
  x: number;
  y: number;
  strokeColor: string;
  backgroundColor: string;
  width: number;
  height: number;
  seed: number;
  groupIds: string[];
  frameId: string | null;
  roundness: { type: number; value?: number } | null;
  boundElements: any[];
  updated: number;
  link: string | null;
  locked: boolean;
  // SVG data for library components
  svg?: string;
  // Additional properties for specific element types
  [key: string]: any;
}

// Library metadata
export interface ExcalidrawLibrary {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  tags?: string[];
  components: ExcalidrawLibraryComponent[];
  addedAt: number;
  source: "file" | "url" | "manual";
  sourceUrl?: string;
  pinned: boolean;
}

export interface LibraryState {
  libraries: ExcalidrawLibrary[];
  pinnedComponents: string[]; // Component IDs
  searchQuery: string;
  selectedLibrary: string | null;
  recentlyUsed: string[]; // Component IDs
  isLibraryPanelOpen: boolean;
}

type LibraryAction =
  | { type: "ADD_LIBRARY"; library: ExcalidrawLibrary }
  | { type: "REMOVE_LIBRARY"; libraryId: string }
  | {
      type: "UPDATE_LIBRARY";
      libraryId: string;
      updates: Partial<ExcalidrawLibrary>;
    }
  | { type: "PIN_COMPONENT"; componentId: string }
  | { type: "UNPIN_COMPONENT"; componentId: string }
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_SELECTED_LIBRARY"; libraryId: string | null }
  | { type: "ADD_TO_RECENT"; componentId: string }
  | { type: "TOGGLE_LIBRARY_PANEL" }
  | { type: "OPEN_LIBRARY_PANEL" }
  | { type: "CLOSE_LIBRARY_PANEL" }
  | { type: "IMPORT_EXCALIDRAW_LIBRARY"; libraryData: any }
  | { type: "CLEAR_SEARCH" }
  | { type: "PIN_LIBRARY"; libraryId: string }
  | { type: "UNPIN_LIBRARY"; libraryId: string };

const initialState: LibraryState = {
  libraries: [],
  pinnedComponents: [],
  searchQuery: "",
  selectedLibrary: null,
  recentlyUsed: [],
  isLibraryPanelOpen: false,
};

function libraryReducer(
  state: LibraryState,
  action: LibraryAction,
): LibraryState {
  switch (action.type) {
    case "ADD_LIBRARY":
      return {
        ...state,
        libraries: [...state.libraries, action.library],
      };

    case "REMOVE_LIBRARY":
      return {
        ...state,
        libraries: state.libraries.filter((lib) => lib.id !== action.libraryId),
        selectedLibrary:
          state.selectedLibrary === action.libraryId
            ? null
            : state.selectedLibrary,
      };

    case "UPDATE_LIBRARY":
      return {
        ...state,
        libraries: state.libraries.map((lib) =>
          lib.id === action.libraryId ? { ...lib, ...action.updates } : lib,
        ),
      };

    case "PIN_COMPONENT":
      return {
        ...state,
        pinnedComponents: [...state.pinnedComponents, action.componentId],
      };

    case "UNPIN_COMPONENT":
      return {
        ...state,
        pinnedComponents: state.pinnedComponents.filter(
          (id) => id !== action.componentId,
        ),
      };

    case "SET_SEARCH_QUERY":
      return {
        ...state,
        searchQuery: action.query,
      };

    case "SET_SELECTED_LIBRARY":
      return {
        ...state,
        selectedLibrary: action.libraryId,
      };

    case "ADD_TO_RECENT":
      const updatedRecent = [
        action.componentId,
        ...state.recentlyUsed.filter((id) => id !== action.componentId),
      ].slice(0, 10);
      return {
        ...state,
        recentlyUsed: updatedRecent,
      };

    case "TOGGLE_LIBRARY_PANEL":
      return {
        ...state,
        isLibraryPanelOpen: !state.isLibraryPanelOpen,
      };

    case "OPEN_LIBRARY_PANEL":
      return {
        ...state,
        isLibraryPanelOpen: true,
      };

    case "CLOSE_LIBRARY_PANEL":
      return {
        ...state,
        isLibraryPanelOpen: false,
      };

    case "IMPORT_EXCALIDRAW_LIBRARY":
      // Parse and convert Excalidraw library format
      try {
        const libraryData = action.libraryData;
        const components = libraryData.library || libraryData.components || [];

        // Validate that the library has valid components
        if (!Array.isArray(components) || components.length === 0) {
          console.warn("Imported library has no valid components");
          return state;
        }

        const newLibrary: ExcalidrawLibrary = {
          id: `library-${Date.now()}`,
          name: libraryData.name || "Imported Library",
          description: libraryData.description || "Imported from file",
          version: libraryData.version || "1.0.0",
          author: libraryData.author || "Unknown",
          tags: libraryData.tags || [],
          components: components,
          addedAt: Date.now(),
          source: "file",
          pinned: false,
        };

        return {
          ...state,
          libraries: [...state.libraries, newLibrary],
        };
      } catch (error) {
        console.error("Failed to import library:", error);
        return state;
      }

    case "CLEAR_SEARCH":
      return {
        ...state,
        searchQuery: "",
      };

    case "PIN_LIBRARY":
      return {
        ...state,
        libraries: state.libraries.map((lib) =>
          lib.id === action.libraryId ? { ...lib, pinned: true } : lib,
        ),
      };

    case "UNPIN_LIBRARY":
      return {
        ...state,
        libraries: state.libraries.map((lib) =>
          lib.id === action.libraryId ? { ...lib, pinned: false } : lib,
        ),
      };

    default:
      return state;
  }
}

interface LibraryContextType {
  state: LibraryState;
  dispatch: React.Dispatch<LibraryAction>;
  // Helper functions
  getAllComponents: () => ExcalidrawLibraryComponent[];
  getFilteredComponents: () => ExcalidrawLibraryComponent[];
  getPinnedComponents: () => ExcalidrawLibraryComponent[];
  getComponentById: (id: string) => ExcalidrawLibraryComponent | undefined;
  addComponentToCanvas: (component: ExcalidrawLibraryComponent) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(libraryReducer, initialState);

  // Helper function to get all components from all libraries
  const getAllComponents = (): ExcalidrawLibraryComponent[] => {
    return state.libraries.flatMap((library) => library.components);
  };

  // Helper function to get filtered components based on search
  const getFilteredComponents = (): ExcalidrawLibraryComponent[] => {
    const allComponents = getAllComponents();

    if (!state.searchQuery.trim()) {
      return allComponents;
    }

    const query = state.searchQuery.toLowerCase();
    return allComponents.filter(
      (component) =>
        component.name?.toLowerCase().includes(query) ||
        component.description?.toLowerCase().includes(query) ||
        component.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  };

  // Helper function to get pinned components
  const getPinnedComponents = (): ExcalidrawLibraryComponent[] => {
    const allComponents = getAllComponents();
    return allComponents.filter((component) =>
      state.pinnedComponents.includes(component.id),
    );
  };

  // Helper function to get component by ID
  const getComponentById = (
    id: string,
  ): ExcalidrawLibraryComponent | undefined => {
    return getAllComponents().find((component) => component.id === id);
  };

  // Helper function to add component to canvas (connected to DrawingContext)
  const addComponentToCanvas = (component: ExcalidrawLibraryComponent) => {
    // Get drawing context (this will be provided via props to avoid circular dependency)
    const center = { x: 400, y: 300 }; // Default center position

    // Add to recent components
    dispatch({ type: "ADD_TO_RECENT", componentId: component.id });

    // Log for now - actual implementation will be done in the LibraryPanel
    console.log(
      "Adding component to canvas:",
      component,
      "at position:",
      center,
    );
  };

  const contextValue: LibraryContextType = {
    state,
    dispatch,
    getAllComponents,
    getFilteredComponents,
    getPinnedComponents,
    getComponentById,
    addComponentToCanvas,
  };

  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}

// Utility functions for working with Excalidraw library format
export function parseExcalidrawLibrary(fileContent: string | ArrayBuffer): any {
  try {
    const content =
      typeof fileContent === "string"
        ? fileContent
        : new TextDecoder().decode(fileContent);
    return JSON.parse(content);
  } catch (error) {
    throw new Error("Invalid Excalidraw library file format");
  }
}

export function validateExcalidrawLibrary(data: any): boolean {
  return (
    data &&
    (Array.isArray(data.library) || Array.isArray(data.components)) &&
    data.version !== undefined
  );
}
