// Native Replay System - Main orchestrator for canvas-based replay
// Handles virtual pages, timeline modes, and viewport management
// Built from scratch to eliminate zoom/scaling issues

import type { DrawingElement } from "../contexts/DrawingContext";
import { NativeCanvasRenderer } from "./NativeCanvasRenderer";
import { ProgressiveAnimationEngine, type AnimationSettings } from "./ProgressiveAnimationEngine";
import { virtualPagesManager, type VirtualPage } from "./virtualPagesManager";

export interface NativeReplayConfig {
  mode: "chronological" | "layer";
  showPageTransitions: boolean;
  transitionDuration: number;
  transitionType: "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "zoom" | "none";
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
 * Native Replay System - No SVG, no coordinate conflicts
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
    animationSettings: AnimationSettings
  ) {
    this.canvas = canvas;
    this.config = config;

    // Initialize viewport to match canvas dimensions
    this.viewport = {
      x: 0,
      y: 0,
      scale: 1,
      width: canvas.width,
      height: canvas.height
    };

    // Initialize renderer and animation engine
    this.renderer = new NativeCanvasRenderer(canvas, this.viewport);
    this.animationEngine = new ProgressiveAnimationEngine(this.renderer, animationSettings);

    console.log(`NativeReplaySystem initialized: ${canvas.width}x${canvas.height}, mode: ${config.mode}`);
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

    console.log(`Elements loaded. Viewport:`, this.viewport);
  }

  /**
   * Calculate optimal viewport to fit all content without zoom issues
   */
  private calculateOptimalViewport(): void {
    if (this.elements.length === 0) return;

    // Find bounding box of all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

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

    // Calculate scale to fit content in canvas with some padding
    const padding = 50;
    const scaleX = (this.canvas.width - padding * 2) / contentWidth;
    const scaleY = (this.canvas.height - padding * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1:1

    // Center content in canvas
    const offsetX = this.canvas.width / 2 - contentCenterX * scale;
    const offsetY = this.canvas.height / 2 - contentCenterY * scale;

    this.viewport = {
      x: offsetX,
      y: offsetY,
      scale: scale,
      width: this.canvas.width,
      height: this.canvas.height
    };

    this.renderer.setViewTransform(this.viewport);

    console.log(`Calculated optimal viewport:`, {
      contentBounds: { minX, minY, maxX, maxY },
      contentSize: { width: contentWidth, height: contentHeight },
      viewport: this.viewport
    });
  }

  /**
   * Start replay with specified mode
   */
  async startReplay(
    onProgress?: (progress: number) => void,
    onComplete?: () => void,
    onPageChange?: (page: VirtualPage) => void
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
    
    if (this.config.showPageTransitions && pageGroups.length > 1) {
      await this.playWithPageTransitions(timeline, pageGroups);
    } else {
      // Simple chronological playback
      this.animationEngine.play(this.onProgressCallback, this.onCompleteCallback);
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

    for (let i = 0; i < pageGroups.length; i++) {
      const group = pageGroups[i];
      console.log(`Replaying page ${group.page.id} with ${group.elements.length} elements`);

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
            const overallProgress = ((i + pageProgress / 100) / totalPages) * 100;
            if (this.onProgressCallback) {
              this.onProgressCallback(overallProgress);
            }
          },
          () => {
            resolve();
          }
        );
      });

      // Small delay between pages
      if (i < pageGroups.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log("Layer replay completed");
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  /**
   * Play with page transitions for chronological mode
   */
  private async playWithPageTransitions(timeline: any, pageGroups: any[]): Promise<void> {
    // This is a complex implementation that would coordinate
    // timeline playback with page transitions
    // For now, fall back to simple playback
    console.log("Page transitions in chronological mode not yet implemented, using simple playback");
    this.animationEngine.play(this.onProgressCallback, this.onCompleteCallback);
  }

  /**
   * Group elements by virtual page
   */
  private groupElementsByPage(elements: DrawingElement[]): Array<{ page: VirtualPage; elements: DrawingElement[] }> {
    const pageMap = new Map<string, { page: VirtualPage; elements: DrawingElement[] }>();

    for (const element of elements) {
      const page = virtualPagesManager.findElementPage(element);
      
      if (!pageMap.has(page.id)) {
        pageMap.set(page.id, { page, elements: [] });
      }
      
      pageMap.get(page.id)!.elements.push(element);
    }

    // Sort by page appearance order (first element timestamp)
    return Array.from(pageMap.values()).sort((a, b) => {
      const firstTimestampA = Math.min(...a.elements.map(e => e.timestamp));
      const firstTimestampB = Math.min(...b.elements.map(e => e.timestamp));
      return firstTimestampA - firstTimestampB;
    });
  }

  /**
   * Transition to a specific page
   */
  private async transitionToPage(page: VirtualPage): Promise<void> {
    console.log(`Transitioning to page ${page.id}`);

    // Calculate viewport for this page
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
   * Calculate viewport for a specific page
   */
  private calculatePageViewport(page: VirtualPage): ReplayViewport {
    // For native canvas, we don't need complex virtual page calculations
    // Just use the optimal viewport we calculated for all content
    return { ...this.viewport };
  }

  /**
   * Animate viewport transition
   */
  private async animateViewportTransition(targetViewport: ReplayViewport): Promise<void> {
    return new Promise((resolve) => {
      const startViewport = { ...this.viewport };
      const duration = this.config.transitionDuration;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = this.easeInOut(progress);

        // Interpolate viewport values
        this.viewport = {
          x: startViewport.x + (targetViewport.x - startViewport.x) * easedProgress,
          y: startViewport.y + (targetViewport.y - startViewport.y) * easedProgress,
          scale: startViewport.scale + (targetViewport.scale - startViewport.scale) * easedProgress,
          width: this.canvas.width,
          height: this.canvas.height
        };

        this.renderer.setViewTransform(this.viewport);
        this.renderer.clear(); // Clear for transition effect

        if (progress >= 1) {
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
      viewport: { ...this.viewport }
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
