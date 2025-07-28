// Progressive Animation Engine - Built from scratch for native canvas replay
// Handles timing, easing, and progressive animations (boundary first, then fill)
// No dependencies on SVG or external animation libraries

import type { DrawingElement } from "../contexts/DrawingContext";
import { NativeCanvasRenderer } from "./NativeCanvasRenderer";

export interface AnimationSettings {
  penStrokes: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
    trueSpeed: boolean;
    trueSpeedRate: number;
  };
  shapes: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
  };
  libraryObjects: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
  };
}

export interface AnimationTimeline {
  elements: DrawingElement[];
  totalDuration: number;
  keyframes: AnimationKeyframe[];
}

export interface AnimationKeyframe {
  timestamp: number;
  elementId: string;
  progress: number; // 0-1
  action: 'start' | 'update' | 'complete';
}

/**
 * Progressive Animation Engine - Smooth timing and easing
 */
export class ProgressiveAnimationEngine {
  private renderer: NativeCanvasRenderer;
  private settings: AnimationSettings;
  private timeline: AnimationTimeline | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrame: number = 0;
  private onProgressCallback?: (progress: number) => void;
  private onCompleteCallback?: () => void;
  private currentElementProgress = new Map<string, number>();

  constructor(renderer: NativeCanvasRenderer, settings: AnimationSettings) {
    this.renderer = renderer;
    this.settings = settings;
    console.log("ProgressiveAnimationEngine initialized");
  }

  /**
   * Build animation timeline from elements
   */
  buildTimeline(elements: DrawingElement[]): AnimationTimeline {
    console.log(`Building timeline for ${elements.length} elements`);
    
    // Sort elements by timestamp for chronological order
    const sortedElements = [...elements].sort((a, b) => a.timestamp - b.timestamp);
    
    const keyframes: AnimationKeyframe[] = [];
    let currentTime = 0;
    
    for (let i = 0; i < sortedElements.length; i++) {
      const element = sortedElements[i];
      const duration = this.getElementDuration(element);
      const delay = i > 0 ? this.getElementDelay(element) : 0;
      
      // Add delay before this element
      currentTime += delay;
      
      // Start keyframe
      keyframes.push({
        timestamp: currentTime,
        elementId: element.id,
        progress: 0,
        action: 'start'
      });
      
      // Progress keyframes (smooth animation)
      const progressSteps = 20; // 20 steps for smooth animation
      for (let step = 1; step <= progressSteps; step++) {
        const stepProgress = step / progressSteps;
        const easedProgress = this.applyEasing(stepProgress, this.getElementEasing(element));
        
        keyframes.push({
          timestamp: currentTime + (duration * stepProgress),
          elementId: element.id,
          progress: easedProgress,
          action: 'update'
        });
      }
      
      // Complete keyframe
      keyframes.push({
        timestamp: currentTime + duration,
        elementId: element.id,
        progress: 1,
        action: 'complete'
      });
      
      currentTime += duration;
    }
    
    this.timeline = {
      elements: sortedElements,
      totalDuration: currentTime,
      keyframes: keyframes.sort((a, b) => a.timestamp - b.timestamp)
    };
    
    console.log(`Timeline built: ${keyframes.length} keyframes, ${currentTime}ms total duration`);
    return this.timeline;
  }

  /**
   * Start animation playback
   */
  play(onProgress?: (progress: number) => void, onComplete?: () => void): void {
    if (!this.timeline) {
      console.error("No timeline available for playback");
      return;
    }

    console.log("Starting animation playback");
    this.isPlaying = true;
    this.startTime = Date.now();
    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;
    this.currentElementProgress.clear();

    // Initialize all elements with 0 progress
    this.timeline.elements.forEach(element => {
      this.currentElementProgress.set(element.id, 0);
    });

    this.animate();
  }

  /**
   * Stop animation playback
   */
  stop(): void {
    console.log("Stopping animation playback");
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.currentElementProgress.clear();
    this.renderer.clear();
  }

  /**
   * Pause animation playback
   */
  pause(): void {
    console.log("Pausing animation playback");
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  /**
   * Resume animation playback
   */
  resume(): void {
    if (!this.timeline) return;
    
    console.log("Resuming animation playback");
    this.isPlaying = true;
    this.startTime = Date.now() - this.getCurrentTime();
    this.animate();
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.isPlaying || !this.timeline) return;

    const currentTime = this.getCurrentTime();
    const globalProgress = Math.min(currentTime / this.timeline.totalDuration, 1);

    // Process keyframes up to current time
    this.processKeyframes(currentTime);

    // Render current frame
    this.renderer.updateAnimation(this.currentElementProgress, globalProgress);
    this.renderer.renderElements(this.timeline.elements);

    // Report progress
    if (this.onProgressCallback) {
      this.onProgressCallback(globalProgress * 100);
    }

    // Check if animation is complete
    if (globalProgress >= 1) {
      this.isPlaying = false;
      console.log("Animation playback completed");
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
      return;
    }

    // Schedule next frame
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  /**
   * Process keyframes for current time
   */
  private processKeyframes(currentTime: number): void {
    if (!this.timeline) return;

    for (const keyframe of this.timeline.keyframes) {
      if (keyframe.timestamp <= currentTime) {
        this.currentElementProgress.set(keyframe.elementId, keyframe.progress);
      } else {
        break; // Keyframes are sorted by timestamp
      }
    }
  }

  /**
   * Get current animation time
   */
  private getCurrentTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get element-specific duration
   */
  private getElementDuration(element: DrawingElement): number {
    switch (element.type) {
      case "path":
        if (this.settings.penStrokes.trueSpeed) {
          return this.calculateTrueSpeedDuration(element);
        }
        return this.settings.penStrokes.elementDuration;
      case "highlighter":
        return this.settings.penStrokes.elementDuration;
      case "rectangle":
      case "ellipse":
      case "line":
      case "arrow":
      case "diamond":
        return this.settings.shapes.elementDuration;
      case "library-component":
        return this.settings.libraryObjects.elementDuration;
      default:
        return this.settings.shapes.elementDuration;
    }
  }

  /**
   * Get element-specific delay
   */
  private getElementDelay(element: DrawingElement): number {
    switch (element.type) {
      case "path":
      case "highlighter":
        return this.settings.penStrokes.groupDelay;
      case "rectangle":
      case "ellipse":
      case "line":
      case "arrow":
      case "diamond":
        return this.settings.shapes.groupDelay;
      case "library-component":
        return this.settings.libraryObjects.groupDelay;
      default:
        return this.settings.shapes.groupDelay;
    }
  }

  /**
   * Get element-specific easing
   */
  private getElementEasing(element: DrawingElement): string {
    switch (element.type) {
      case "path":
      case "highlighter":
        return this.settings.penStrokes.easing;
      case "rectangle":
      case "ellipse":
      case "line":
      case "arrow":
      case "diamond":
        return this.settings.shapes.easing;
      case "library-component":
        return this.settings.libraryObjects.easing;
      default:
        return this.settings.shapes.easing;
    }
  }

  /**
   * Calculate true speed duration for path elements
   */
  private calculateTrueSpeedDuration(element: DrawingElement): number {
    if (!element.points || element.points.length < 2) {
      return this.settings.penStrokes.elementDuration;
    }

    let totalLength = 0;
    for (let i = 1; i < element.points.length; i++) {
      const dx = element.points[i].x - element.points[i - 1].x;
      const dy = element.points[i].y - element.points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    const duration = (Math.max(totalLength, 10) / this.settings.penStrokes.trueSpeedRate) * 1000;
    return Math.max(100, Math.min(duration, 10000)); // Clamp between 100ms and 10s
  }

  /**
   * Apply easing function to progress value
   */
  private applyEasing(progress: number, easing: string): number {
    switch (easing) {
      case "ease-in":
        return progress * progress;
      case "ease-out":
        return 1 - Math.pow(1 - progress, 2);
      case "ease-in-out":
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case "linear":
        return progress;
      default:
        return progress; // Default to linear
    }
  }

  /**
   * Seek to specific time in animation
   */
  seekTo(timeMs: number): void {
    if (!this.timeline) return;

    const clampedTime = Math.max(0, Math.min(timeMs, this.timeline.totalDuration));
    this.processKeyframes(clampedTime);
    
    // Update renderer with current state
    const globalProgress = clampedTime / this.timeline.totalDuration;
    this.renderer.updateAnimation(this.currentElementProgress, globalProgress);
    this.renderer.renderElements(this.timeline.elements);

    console.log(`Seeked to ${clampedTime}ms (${(globalProgress * 100).toFixed(1)}%)`);
  }

  /**
   * Get animation statistics
   */
  getStats(): { totalDuration: number; keyframes: number; elements: number } {
    if (!this.timeline) {
      return { totalDuration: 0, keyframes: 0, elements: 0 };
    }

    return {
      totalDuration: this.timeline.totalDuration,
      keyframes: this.timeline.keyframes.length,
      elements: this.timeline.elements.length
    };
  }

  /**
   * Update animation settings
   */
  updateSettings(settings: Partial<AnimationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    console.log("Animation settings updated:", this.settings);
  }

  /**
   * Get current progress
   */
  getCurrentProgress(): number {
    if (!this.timeline || !this.isPlaying) return 0;
    return Math.min(this.getCurrentTime() / this.timeline.totalDuration, 1);
  }

  /**
   * Check if animation is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
