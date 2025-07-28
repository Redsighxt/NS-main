// Virtual Pages Manager - Auto-creates and manages 1920x1080 virtual pages in infinite canvas
import type { DrawingElement } from "../contexts/DrawingContext";

export interface VirtualPage {
  id: string;
  x: number; // position relative to origin
  y: number;
  width: number; // always 1920
  height: number; // always 1080
  elements: DrawingElement[];
  isOrigin: boolean; // true for the origin page (0,0)
  gridPosition: { row: number; col: number };
}

export interface VirtualPagesState {
  pages: Map<string, VirtualPage>;
  originPageId: string;
  currentActivePage: string | null;
  pageSize: { width: number; height: number };
}

export class VirtualPagesManager {
  private state: VirtualPagesState;
  private readonly PAGE_WIDTH = 1920;
  private readonly PAGE_HEIGHT = 1080;

  constructor() {
    this.state = {
      pages: new Map(),
      originPageId: "page-0-0", // Origin page at (0,0)
      currentActivePage: null,
      pageSize: { width: this.PAGE_WIDTH, height: this.PAGE_HEIGHT },
    };

    // Create the origin page
    this.createOriginPage();
  }

  /**
   * Create the origin page at (0,0)
   */
  private createOriginPage(): void {
    const originPage: VirtualPage = {
      id: this.state.originPageId,
      x: 0,
      y: 0,
      width: this.PAGE_WIDTH,
      height: this.PAGE_HEIGHT,
      elements: [],
      isOrigin: true,
      gridPosition: { row: 0, col: 0 },
    };

    this.state.pages.set(this.state.originPageId, originPage);
    this.state.currentActivePage = this.state.originPageId;
    console.log("VirtualPagesManager: Created origin page at (0,0)");
  }

  /**
   * Get page ID from coordinates
   */
  private getPageIdFromCoordinates(x: number, y: number): string {
    const col = Math.floor(x / this.PAGE_WIDTH);
    const row = Math.floor(y / this.PAGE_HEIGHT);
    return `page-${row}-${col}`;
  }

  /**
   * Get page grid position from coordinates
   */
  private getGridPositionFromCoordinates(
    x: number,
    y: number,
  ): { row: number; col: number } {
    const col = Math.floor(x / this.PAGE_WIDTH);
    const row = Math.floor(y / this.PAGE_HEIGHT);
    return { row, col };
  }

  /**
   * Get page boundaries from grid position
   */
  private getPageBoundariesFromGrid(
    row: number,
    col: number,
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: col * this.PAGE_WIDTH,
      y: row * this.PAGE_HEIGHT,
      width: this.PAGE_WIDTH,
      height: this.PAGE_HEIGHT,
    };
  }

  /**
   * Auto-create a virtual page if it doesn't exist
   */
  private createPageIfNeeded(x: number, y: number): VirtualPage {
    const pageId = this.getPageIdFromCoordinates(x, y);

    if (this.state.pages.has(pageId)) {
      return this.state.pages.get(pageId)!;
    }

    const gridPosition = this.getGridPositionFromCoordinates(x, y);
    const boundaries = this.getPageBoundariesFromGrid(
      gridPosition.row,
      gridPosition.col,
    );

    const newPage: VirtualPage = {
      id: pageId,
      x: boundaries.x,
      y: boundaries.y,
      width: this.PAGE_WIDTH,
      height: this.PAGE_HEIGHT,
      elements: [],
      isOrigin: gridPosition.row === 0 && gridPosition.col === 0,
      gridPosition,
    };

    this.state.pages.set(pageId, newPage);
    console.log(
      `VirtualPagesManager: Created new page ${pageId} at (${boundaries.x}, ${boundaries.y})`,
    );

    return newPage;
  }

  /**
   * Find which page an element belongs to
   */
  findElementPage(element: DrawingElement): VirtualPage {
    // Use element center point to determine page
    let centerX = element.x;
    let centerY = element.y;

    if (element.points && element.points.length > 0) {
      // For path elements, use the bounding box center
      const minX = Math.min(...element.points.map((p) => p.x));
      const maxX = Math.max(...element.points.map((p) => p.x));
      const minY = Math.min(...element.points.map((p) => p.y));
      const maxY = Math.max(...element.points.map((p) => p.y));

      centerX = (minX + maxX) / 2;
      centerY = (minY + maxY) / 2;
    } else if (element.width && element.height) {
      // For shapes, use actual center
      centerX = element.x + element.width / 2;
      centerY = element.y + element.height / 2;
    }

    return this.createPageIfNeeded(centerX, centerY);
  }

  /**
   * Add element to appropriate virtual page
   */
  addElement(element: DrawingElement): void {
    const page = this.findElementPage(element);

    // Remove element from other pages first (in case it moved)
    this.removeElementFromAllPages(element.id);

    // Add to the correct page
    page.elements.push(element);

    console.log(
      `VirtualPagesManager: Added element ${element.id} to page ${page.id}`,
    );
  }

  /**
   * Remove element from all pages
   */
  removeElementFromAllPages(elementId: string): void {
    for (const page of this.state.pages.values()) {
      page.elements = page.elements.filter((el) => el.id !== elementId);
    }
  }

  /**
   * Update element position (move between pages if needed)
   */
  updateElement(element: DrawingElement): void {
    this.addElement(element); // This will automatically move it to the correct page
  }

  /**
   * Get all virtual pages
   */
  getAllPages(): VirtualPage[] {
    return Array.from(this.state.pages.values());
  }

  /**
   * Get origin page
   */
  getOriginPage(): VirtualPage {
    return this.state.pages.get(this.state.originPageId)!;
  }

  /**
   * Get page by ID
   */
  getPage(pageId: string): VirtualPage | null {
    return this.state.pages.get(pageId) || null;
  }

  /**
   * Get current active page
   */
  getCurrentActivePage(): VirtualPage | null {
    return this.state.currentActivePage
      ? this.getPage(this.state.currentActivePage)
      : null;
  }

  /**
   * Set current active page
   */
  setActivePage(pageId: string): void {
    if (this.state.pages.has(pageId)) {
      this.state.currentActivePage = pageId;
      console.log(`VirtualPagesManager: Active page set to ${pageId}`);
    }
  }

  /**
   * Get adjacent pages (for smooth transitions)
   */
  getAdjacentPages(pageId: string): {
    top?: VirtualPage;
    bottom?: VirtualPage;
    left?: VirtualPage;
    right?: VirtualPage;
  } {
    const page = this.getPage(pageId);
    if (!page) return {};

    const { row, col } = page.gridPosition;

    return {
      top: this.getPage(`page-${row - 1}-${col}`),
      bottom: this.getPage(`page-${row + 1}-${col}`),
      left: this.getPage(`page-${row}-${col - 1}`),
      right: this.getPage(`page-${row}-${col + 1}`),
    };
  }

  /**
   * Get pages in animation order (chronological by first element timestamp)
   */
  getAnimationOrderedPages(): VirtualPage[] {
    const pagesWithElements = this.getAllPages().filter(
      (page) => page.elements.length > 0,
    );

    return pagesWithElements.sort((a, b) => {
      const firstElementA = a.elements.reduce(
        (earliest, el) =>
          !earliest || el.timestamp < earliest.timestamp ? el : earliest,
        null as DrawingElement | null,
      );
      const firstElementB = b.elements.reduce(
        (earliest, el) =>
          !earliest || el.timestamp < earliest.timestamp ? el : earliest,
        null as DrawingElement | null,
      );

      if (!firstElementA) return 1;
      if (!firstElementB) return -1;

      return firstElementA.timestamp - firstElementB.timestamp;
    });
  }

  /**
   * Get statistics about virtual pages
   */
  getStatistics() {
    const allPages = this.getAllPages();
    const pagesWithElements = allPages.filter(
      (page) => page.elements.length > 0,
    );
    const totalElements = allPages.reduce(
      (sum, page) => sum + page.elements.length,
      0,
    );

    return {
      totalPages: allPages.length,
      pagesWithElements: pagesWithElements.length,
      totalElements,
      originPageElements: this.getOriginPage().elements.length,
    };
  }

  /**
   * Reset all pages (for testing or clearing)
   */
  reset(): void {
    this.state.pages.clear();
    this.createOriginPage();
    console.log("VirtualPagesManager: Reset to origin page only");
  }

  /**
   * Rebuild pages from elements array (useful for initialization)
   */
  rebuildFromElements(elements: DrawingElement[]): void {
    console.log(
      `VirtualPagesManager: Rebuilding pages from ${elements.length} elements`,
    );

    // Clear all pages except origin
    this.reset();

    // Add all elements
    elements.forEach((element) => {
      this.addElement(element);
    });

    const stats = this.getStatistics();
    console.log(
      `VirtualPagesManager: Rebuild complete - ${stats.totalPages} pages, ${stats.pagesWithElements} with content`,
    );
  }
}

// Singleton instance for global access
export const virtualPagesManager = new VirtualPagesManager();
