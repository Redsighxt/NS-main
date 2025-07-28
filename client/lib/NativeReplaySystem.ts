// Native Replay System - Fixed version
// Handles virtual pages, timeline modes, and viewport management
// Built from scratch to eliminate zoom/scaling issues

import type { DrawingElement } from "../contexts/DrawingContext";
import { NativeCanvasRenderer } from "./NativeCanvasRenderer";
import {
  ProgressiveAnimationEngine,
  type AnimationSettings,
} from "./ProgressiveAnimationEngine";
import { virtualPagesManager, type VirtualPage } from "./virtualPagesManager";

export interface NativeReplayConfig {
  mode: "chronological" | "layer";
  showPageTransitions: boolean;
  transitionDuration: number;
  transitionType:
    | "fade"
    | "slide-left"
    | "slide-right"
    | "slide-up"
    | "slide-down"
    | "zoom"
    | "none";
  showPageIndicators: boolean;
  autoScale: boolean;
}

export interface ReplayViewport {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}

/**
 * Native Replay System - No SVG, no coordinate conflicts - Fixed version
 * Uses native canvas rendering for perfect compatibility with drawing system
 */
export class NativeReplaySystem {
  private canvas: HTMLCanvasElement;
  private renderer: NativeCanvasRenderer;
  private animationEngine: ProgressiveAnimationEngine;
  private config: NativeReplayConfig;
  private viewport: ReplayViewport;
  private elements: DrawingElement[] = [];
  private currentPage: VirtualPage | null = null;
  private isPlaying: boolean = false;

  // Callbacks
  private onProgressCallback?: (progress: number) => void;
  private onCompleteCallback?: () => void;
  private onPageChangeCallback?: (page: VirtualPage) => void;

  constructor(
    canvas: HTMLCanvasElement,
    config: NativeReplayConfig,
    animationSettings: AnimationSettings,
  ) {
    this.canvas = canvas;
    this.config = config;

    // CRITICAL FIX: Initialize viewport to proper 1:1 scale without zoom issues
    this.viewport = {
      x: 0,
      y: 0,
      scale: 1, // Always use 1:1 scale to prevent zoom issues
      width: canvas.width,
      height: canvas.height,
    };

    // Initialize renderer and animation engine
    this.renderer = new NativeCanvasRenderer(canvas, this.viewport);
    this.animationEngine = new ProgressiveAnimationEngine(
      this.renderer,
      animationSettings,
    );

    console.log(
      `NativeReplaySystem initialized: ${canvas.width}x${canvas.height}, mode: ${config.mode}`,
    );
    console.log(`Initial viewport:`, this.viewport);
  }

  /**
   * Load elements for replay
   */
  loadElements(elements: DrawingElement[]): void {
    console.log(`Loading ${elements.length} elements for replay`);
    this.elements = [...elements];

    // Calculate optimal viewport for content
    if (this.config.autoScale) {
      this.calculateOptimalViewport();
    }

    console.log(`Elements loaded. Final viewport:`, this.viewport);
  }

  /**
   * Calculate optimal viewport to fit all content - Fixed to prevent zoom issues
   */
  private calculateOptimalViewport(): void {
    if (this.elements.length === 0) return;

    // Find bounding box of all elements
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const element of this.elements) {
      if (element.points && element.points.length > 0) {
        // For path elements, check all points
        for (const point of element.points) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      } else {
        // For other elements, use x, y, width, height
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + (element.width || 0));
        maxY = Math.max(maxY, element.y + (element.height || 0));
      }
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // CRITICAL FIX: Use conservative scaling to prevent zoom issues
    const padding = 100; // Increased padding for better visibility
    const scaleX = (this.canvas.width - padding * 2) / contentWidth;
    const scaleY = (this.canvas.height - padding * 2) / contentHeight;
    const calculatedScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1:1

    // FORCE scale to be 1 to prevent ANY zoom issues
    const scale = this.config.autoScale ? Math.min(calculatedScale, 1) : 1;

    // Calculate content centering with proper bounds checking
    const canvasCenterX = this.canvas.width / 2;
    const canvasCenterY = this.canvas.height / 2;

    // Center content in canvas with the applied scale
    const offsetX = canvasCenterX - contentCenterX * scale;
    const offsetY = canvasCenterY - contentCenterY * scale;

    // Ensure offset doesn't push content too far off-canvas
    const maxOffsetX = this.canvas.width * 0.3; // Allow 30% offset
    const maxOffsetY = this.canvas.height * 0.3;

    this.viewport = {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY)),
      scale: scale,
      width: this.canvas.width,
      height: this.canvas.height,
    };

    this.renderer.setViewTransform(this.viewport);

    console.log(`Calculated optimal viewport (zoom-safe):`, {
      contentBounds: { minX, minY, maxX, maxY },
      contentSize: { width: contentWidth, height: contentHeight },
      contentCenter: { x: contentCenterX, y: contentCenterY },
      calculatedScale,
      finalScale: scale,
      viewport: this.viewport,
    });
  }

  /**
   * Start replay with specified mode
   */
  async startReplay(
    onProgress?: (progress: number) => void,
    onComplete?: () => void,
    onPageChange?: (page: VirtualPage) => void,
  ): Promise<void> {
    if (this.elements.length === 0) {
      console.warn("No elements to replay");
      return;
    }

    console.log(`Starting ${this.config.mode} replay`);
    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;
    this.onPageChangeCallback = onPageChange;
    this.isPlaying = true;

    if (this.config.mode === "chronological") {
      await this.startChronologicalReplay();
    } else {
      await this.startLayerReplay();
    }
  }

  /**
   * Start chronological replay - elements in timeline order with page transitions
   */
  private async startChronologicalReplay(): Promise<void> {
    console.log("Starting chronological replay");

    // Build timeline for all elements
    const timeline = this.animationEngine.buildTimeline(this.elements);

    // Group elements by page for transitions
    const pageGroups = this.groupElementsByPage(this.elements);

    console.log(`Timeline built with ${timeline.length} events`);
    console.log(`Found ${pageGroups.length} page groups`);

    if (this.config.showPageTransitions && pageGroups.length > 1) {
      await this.playWithPageTransitions(timeline, pageGroups);
    } else {
      // Simple chronological playback
      this.animationEngine.play(
        this.onProgressCallback,
        this.onCompleteCallback,
      );
    }
  }

  /**
   * Start layer replay - page by page
   */
  private async startLayerReplay(): Promise<void> {
    console.log("Starting layer replay");

    const pageGroups = this.groupElementsByPage(this.elements);
    let totalProgress = 0;
    const totalPages = pageGroups.length;

    console.log(`Layer replay with ${totalPages} pages`);

    for (let i = 0; i < pageGroups.length; i++) {
      const group = pageGroups[i];
      console.log(
        `Replaying page ${group.page.id} with ${group.elements.length} elements`,
      );

      // Transition to page
      if (this.config.showPageTransitions) {
        await this.transitionToPage(group.page);
      } else {
        this.setCurrentPage(group.page);
      }

      // Build timeline for this page's elements
      const pageTimeline = this.animationEngine.buildTimeline(group.elements);

      // Play page animation
      await new Promise<void>((resolve) => {
        this.animationEngine.play(
          (pageProgress) => {
            const overallProgress =
              ((i + pageProgress / 100) / totalPages) * 100;
            if (this.onProgressCallback) {
              this.onProgressCallback(overallProgress);
            }
          },
          () => {
            resolve();
          },
        );
      });

      // Small delay between pages
      if (i < pageGroups.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("Layer replay completed");
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  /**
   * Play with page transitions for chronological mode - Enhanced version
   */
  private async playWithPageTransitions(
    timeline: any,
    pageGroups: any[],
  ): Promise<void> {
    console.log("Starting chronological replay with page transitions");

    // Build a combined timeline that includes page transitions
    let currentPageIndex = -1;
    let elementIndex = 0;
    const totalElements = this.elements.length;

    // Sort elements by timestamp for chronological order
    const sortedElements = [...this.elements].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (const element of sortedElements) {
      // Find which page this element belongs to
      const elementPage = virtualPagesManager.findElementPage(element);
      const pageGroupIndex = pageGroups.findIndex(
        (group) => group.page.id === elementPage.id,
      );

      // If we need to switch to a new page
      if (pageGroupIndex !== currentPageIndex) {
        console.log(
          `Switching to page ${elementPage.id} for element ${element.id}`,
        );

        // Transition to the new page
        await this.transitionToPage(elementPage);
        currentPageIndex = pageGroupIndex;

        // Small delay after page transition
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Animate the single element
      const singleElementTimeline = this.animationEngine.buildTimeline([
        element,
      ]);

      await new Promise<void>((resolve) => {
        this.animationEngine.play(
          (progress) => {
            // Calculate overall progress
            const overallProgress =
              ((elementIndex + progress / 100) / totalElements) * 100;
            if (this.onProgressCallback) {
              this.onProgressCallback(overallProgress);
            }
          },
          () => {
            resolve();
          },
        );
      });

      elementIndex++;

      // Small delay between elements
      if (elementIndex < totalElements) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log("Chronological replay with page transitions completed");
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  /**
   * Group elements by virtual page
   */
  private groupElementsByPage(
    elements: DrawingElement[],
  ): Array<{ page: VirtualPage; elements: DrawingElement[] }> {
    const pageMap = new Map<
      string,
      { page: VirtualPage; elements: DrawingElement[] }
    >();

    for (const element of elements) {
      const page = virtualPagesManager.findElementPage(element);

      if (!pageMap.has(page.id)) {
        pageMap.set(page.id, { page, elements: [] });
      }

      pageMap.get(page.id)!.elements.push(element);
    }

    // Sort by page appearance order (first element timestamp)
    const groups = Array.from(pageMap.values()).sort((a, b) => {
      const firstTimestampA = Math.min(...a.elements.map((e) => e.timestamp));
      const firstTimestampB = Math.min(...b.elements.map((e) => e.timestamp));
      return firstTimestampA - firstTimestampB;
    });

    console.log(
      `Grouped ${elements.length} elements into ${groups.length} pages:`,
      groups.map((g) => ({
        pageId: g.page.id,
        elementCount: g.elements.length,
      })),
    );

    return groups;
  }

  /**
   * Transition to a specific page - Fixed version
   */
  private async transitionToPage(page: VirtualPage): Promise<void> {
    console.log(`Transitioning to page ${page.id}`, page);

    // Calculate viewport for this page with improved logic
    const pageViewport = this.calculatePageViewport(page);

    if (this.config.transitionType === "none") {
      // Instant transition
      this.viewport = pageViewport;
      this.renderer.setViewTransform(this.viewport);
    } else {
      // Animated transition
      await this.animateViewportTransition(pageViewport);
    }

    this.setCurrentPage(page);
  }

  /**
   * Calculate viewport for a specific page - Fixed version
   */
  private calculatePageViewport(page: VirtualPage): ReplayViewport {
    // CRITICAL FIX: Calculate proper viewport translation for page
    let translateX = 0;
    let translateY = 0;

    if (!page.isOrigin) {
      // For non-origin pages, translate to show the page content
      // Virtual pages have negative coordinates for pages above/left of origin
      translateX = -page.x;
      translateY = -page.y;
    }

    // Keep the same scale to prevent zoom issues
    return {
      x: translateX,
      y: translateY,
      scale: this.viewport.scale, // Maintain current scale
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Animate viewport transition - Fixed version
   */
  private async animateViewportTransition(
    targetViewport: ReplayViewport,
  ): Promise<void> {
    return new Promise((resolve) => {
      const startViewport = { ...this.viewport };
      const duration = this.config.transitionDuration;
      const startTime = Date.now();

      console.log(`Animating viewport transition:`, {
        from: startViewport,
        to: targetViewport,
        duration,
      });

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = this.easeInOut(progress);

        // Interpolate viewport values
        this.viewport = {
          x:
            startViewport.x +
            (targetViewport.x - startViewport.x) * easedProgress,
          y:
            startViewport.y +
            (targetViewport.y - startViewport.y) * easedProgress,
          scale:
            startViewport.scale +
            (targetViewport.scale - startViewport.scale) * easedProgress,
          width: this.canvas.width,
          height: this.canvas.height,
        };

        this.renderer.setViewTransform(this.viewport);
        this.renderer.clear(); // Clear for transition effect

        if (progress >= 1) {
          console.log(
            `Viewport transition completed. Final viewport:`,
            this.viewport,
          );
          resolve();
        } else {
          requestAnimationFrame(animate);
        }
      };

      animate();
    });
  }

  /**
   * Set current page and notify callback
   */
  private setCurrentPage(page: VirtualPage): void {
    this.currentPage = page;
    console.log(`Current page set to: ${page.id}`, page);
    if (this.onPageChangeCallback) {
      this.onPageChangeCallback(page);
    }
  }

  /**
   * Ease-in-out function for smooth transitions
   */
  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Stop replay
   */
  stop(): void {
    console.log("Stopping replay");
    this.isPlaying = false;
    this.animationEngine.stop();
  }

  /**
   * Pause replay
   */
  pause(): void {
    console.log("Pausing replay");
    this.animationEngine.pause();
  }

  /**
   * Resume replay
   */
  resume(): void {
    console.log("Resuming replay");
    this.animationEngine.resume();
  }

  /**
   * Seek to specific progress (0-100)
   */
  seekTo(progressPercent: number): void {
    const stats = this.animationEngine.getStats();
    const timeMs = (progressPercent / 100) * stats.totalDuration;
    this.animationEngine.seekTo(timeMs);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NativeReplayConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("Replay config updated:", this.config);
  }

  /**
   * Update animation settings
   */
  updateAnimationSettings(settings: Partial<AnimationSettings>): void {
    this.animationEngine.updateSettings(settings);
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport.width = width;
    this.viewport.height = height;
    this.renderer.resize(width, height);

    // Recalculate optimal viewport if auto-scaling
    if (this.config.autoScale) {
      this.calculateOptimalViewport();
    }

    console.log(`Replay system resized to: ${width}x${height}`);
  }

  /**
   * Get current statistics
   */
  getStats(): {
    elements: number;
    pages: number;
    isPlaying: boolean;
    currentProgress: number;
    viewport: ReplayViewport;
  } {
    const pageGroups = this.groupElementsByPage(this.elements);

    return {
      elements: this.elements.length,
      pages: pageGroups.length,
      isPlaying: this.animationEngine.getIsPlaying(),
      currentProgress: this.animationEngine.getCurrentProgress() * 100,
      viewport: { ...this.viewport },
    };
  }

  /**
   * Check if replay is currently playing
   */
  getIsPlaying(): boolean {
    return this.animationEngine.getIsPlaying();
  }

  /**
   * Get current page
   */
  getCurrentPage(): VirtualPage | null {
    return this.currentPage;
  }
}
