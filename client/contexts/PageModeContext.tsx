import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { DrawingElement } from "./DrawingContext";

export interface PageModeData {
  id: string;
  name: string;
  elements: DrawingElement[];
  createdAt: number;
  thumbnail?: string; // Optional thumbnail image data URL
  hidden: boolean; // Whether page is hidden from view
  locked: boolean; // Whether page is locked (no drawing allowed)
  pinned: boolean; // Whether page is pinned (important/favorite)
}

export interface PageModeState {
  pages: PageModeData[];
  currentPageId: string | null;
  pageSize: { width: number; height: number };
}

type PageModeAction =
  | { type: "ADD_PAGE"; page: Omit<PageModeData, "id" | "createdAt"> }
  | { type: "DELETE_PAGE"; pageId: string }
  | { type: "SET_CURRENT_PAGE"; pageId: string }
  | { type: "UPDATE_PAGE_ELEMENTS"; pageId: string; elements: DrawingElement[] }
  | { type: "RENAME_PAGE"; pageId: string; name: string }
  | { type: "DUPLICATE_PAGE"; pageId: string }
  | { type: "REORDER_PAGES"; fromIndex: number; toIndex: number }
  | { type: "CLEAR_ALL_PAGES" }
  | { type: "CLEAR_PAGE"; pageId: string }
  | { type: "TOGGLE_PAGE_HIDDEN"; pageId: string }
  | { type: "TOGGLE_PAGE_LOCKED"; pageId: string }
  | { type: "TOGGLE_PAGE_PINNED"; pageId: string }
  | { type: "SET_PAGE_SIZE"; size: { width: number; height: number } };

const initialState: PageModeState = {
  pages: [
    {
      id: "page-1",
      name: "Page 1",
      elements: [],
      createdAt: Date.now(),
      hidden: false,
      locked: false,
      pinned: false,
    },
  ],
  currentPageId: "page-1",
  pageSize: { width: 1920, height: 1080 },
};

function pageModeReducer(
  state: PageModeState,
  action: PageModeAction,
): PageModeState {
  switch (action.type) {
    case "ADD_PAGE": {
      const newPage: PageModeData = {
        ...action.page,
        id: `page-${Date.now()}`,
        createdAt: Date.now(),
        hidden: false,
        locked: false,
        pinned: false,
      };

      return {
        ...state,
        pages: [...state.pages, newPage],
        currentPageId: newPage.id, // Switch to new page
      };
    }

    case "DELETE_PAGE": {
      const updatedPages = state.pages.filter(
        (page) => page.id !== action.pageId,
      );

      // Ensure we always have at least one page
      if (updatedPages.length === 0) {
        const defaultPage: PageModeData = {
          id: "page-1",
          name: "Page 1",
          elements: [],
          createdAt: Date.now(),
          hidden: false,
          locked: false,
          pinned: false,
        };
        return {
          ...state,
          pages: [defaultPage],
          currentPageId: defaultPage.id,
        };
      }

      // If we deleted the current page, switch to the first available page
      const newCurrentPageId =
        state.currentPageId === action.pageId
          ? updatedPages[0].id
          : state.currentPageId;

      return {
        ...state,
        pages: updatedPages,
        currentPageId: newCurrentPageId,
      };
    }

    case "SET_CURRENT_PAGE": {
      return {
        ...state,
        currentPageId: action.pageId,
      };
    }

    case "UPDATE_PAGE_ELEMENTS": {
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.pageId
            ? { ...page, elements: action.elements }
            : page,
        ),
      };
    }

    case "RENAME_PAGE": {
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.pageId ? { ...page, name: action.name } : page,
        ),
      };
    }

    case "DUPLICATE_PAGE": {
      const sourcePage = state.pages.find((page) => page.id === action.pageId);
      if (!sourcePage) return state;

      const duplicatedPage: PageModeData = {
        id: `page-${Date.now()}`,
        name: `${sourcePage.name} (Copy)`,
        elements: [...sourcePage.elements], // Deep copy of elements
        createdAt: Date.now(),
        thumbnail: sourcePage.thumbnail,
      };

      const sourceIndex = state.pages.findIndex(
        (page) => page.id === action.pageId,
      );
      const newPages = [...state.pages];
      newPages.splice(sourceIndex + 1, 0, duplicatedPage);

      return {
        ...state,
        pages: newPages,
        currentPageId: duplicatedPage.id, // Switch to duplicated page
      };
    }

    case "REORDER_PAGES": {
      const newPages = [...state.pages];
      const [movedPage] = newPages.splice(action.fromIndex, 1);
      newPages.splice(action.toIndex, 0, movedPage);

      return {
        ...state,
        pages: newPages,
      };
    }

    case "CLEAR_ALL_PAGES": {
      const defaultPage: PageModeData = {
        id: "page-1",
        name: "Page 1",
        elements: [],
        createdAt: Date.now(),
        hidden: false,
        locked: false,
        pinned: false,
      };

      return {
        ...state,
        pages: [defaultPage],
        currentPageId: defaultPage.id,
      };
    }

    case "CLEAR_PAGE": {
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.pageId ? { ...page, elements: [] } : page,
        ),
      };
    }

    case "TOGGLE_PAGE_HIDDEN": {
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.pageId ? { ...page, hidden: !page.hidden } : page,
        ),
      };
    }

    case "TOGGLE_PAGE_LOCKED": {
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.pageId ? { ...page, locked: !page.locked } : page,
        ),
      };
    }

    case "TOGGLE_PAGE_PINNED": {
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.pageId ? { ...page, pinned: !page.pinned } : page,
        ),
      };
    }

    case "SET_PAGE_SIZE": {
      return {
        ...state,
        pageSize: action.size,
      };
    }

    default:
      return state;
  }
}

interface PageModeContextType {
  state: PageModeState;
  dispatch: React.Dispatch<PageModeAction>;
  // Helper functions
  getCurrentPage: () => PageModeData | null;
  addNewPage: (name?: string) => void;
  switchToPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  updatePageElements: (pageId: string, elements: DrawingElement[]) => void;
  clearPage: (pageId: string) => void;
  togglePageHidden: (pageId: string) => void;
  togglePageLocked: (pageId: string) => void;
  togglePagePinned: (pageId: string) => void;
}

const PageModeContext = createContext<PageModeContextType | undefined>(
  undefined,
);

export function PageModeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pageModeReducer, initialState);

  // Helper functions
  const getCurrentPage = (): PageModeData | null => {
    return state.pages.find((page) => page.id === state.currentPageId) || null;
  };

  const addNewPage = (name?: string) => {
    const pageNumber = state.pages.length + 1;
    dispatch({
      type: "ADD_PAGE",
      page: {
        name: name || `Page ${pageNumber}`,
        elements: [],
      },
    });
  };

  const switchToPage = (pageId: string) => {
    dispatch({ type: "SET_CURRENT_PAGE", pageId });
  };

  const deletePage = (pageId: string) => {
    dispatch({ type: "DELETE_PAGE", pageId });
  };

  const duplicatePage = (pageId: string) => {
    dispatch({ type: "DUPLICATE_PAGE", pageId });
  };

  const renamePage = (pageId: string, name: string) => {
    dispatch({ type: "RENAME_PAGE", pageId, name });
  };

  const updatePageElements = (pageId: string, elements: DrawingElement[]) => {
    dispatch({ type: "UPDATE_PAGE_ELEMENTS", pageId, elements });
  };

  const clearPage = (pageId: string) => {
    dispatch({ type: "CLEAR_PAGE", pageId });
  };

  const togglePageHidden = (pageId: string) => {
    dispatch({ type: "TOGGLE_PAGE_HIDDEN", pageId });
  };

  const togglePageLocked = (pageId: string) => {
    dispatch({ type: "TOGGLE_PAGE_LOCKED", pageId });
  };

  const togglePagePinned = (pageId: string) => {
    dispatch({ type: "TOGGLE_PAGE_PINNED", pageId });
  };

  const contextValue: PageModeContextType = {
    state,
    dispatch,
    getCurrentPage,
    addNewPage,
    switchToPage,
    deletePage,
    duplicatePage,
    renamePage,
    updatePageElements,
    clearPage,
    togglePageHidden,
    togglePageLocked,
    togglePagePinned,
  };

  return (
    <PageModeContext.Provider value={contextValue}>
      {children}
    </PageModeContext.Provider>
  );
}

export function usePageMode() {
  const context = useContext(PageModeContext);
  if (context === undefined) {
    throw new Error("usePageMode must be used within a PageModeProvider");
  }
  return context;
}
