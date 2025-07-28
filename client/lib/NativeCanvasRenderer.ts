// Native Canvas Renderer - Built from scratch for replay system
// Direct canvas rendering without SVG or coordinate transformation conflicts
// Designed specifically for 949x701 adaptive canvas and drawing elements

import type { DrawingElement } from "../contexts/DrawingContext";

export interface RenderConfig {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewTransform: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface AnimationState {
  progress: number; // 0-1
  elementProgress: Map<string, number>; // Element ID -> progress (0-1)
  isPlaying: boolean;
  currentTimestamp: number;
}

/**
 * Native Canvas Renderer - No SVG, no coordinate conflicts
 * Renders elements directly to canvas using the same system as the main drawing canvas
 */
export class NativeCanvasRenderer {
  private config: RenderConfig;
  private animationState: AnimationState;

  constructor(canvas: HTMLCanvasElement, viewTransform: { x: number; y: number; scale: number }) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas 2D context");
    }

    this.config = {
      canvas,
      ctx,
      viewTransform: { ...viewTransform }
    };

    this.animationState = {
      progress: 0,
      elementProgress: new Map(),
      isPlaying: false,
      currentTimestamp: 0
    };

    console.log(`NativeCanvasRenderer initialized: ${canvas.width}x${canvas.height}`);
  }

  /**
   * Clear the entire canvas
   */
  clear(): void {
    const { ctx, canvas } = this.config;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Set viewport transform (for virtual page navigation)
   */
  setViewTransform(transform: { x: number; y: number; scale: number }): void {
    this.config.viewTransform = { ...transform };
    console.log(`View transform updated:`, this.config.viewTransform);
  }

  /**
   * Apply view transform to canvas context
   */
  private applyViewTransform(): void {
    const { ctx, viewTransform } = this.config;
    ctx.setTransform(
      viewTransform.scale, 0, 0, viewTransform.scale,
      viewTransform.x, viewTransform.y
    );
  }

  /**
   * Reset canvas transform to identity
   */
  private resetTransform(): void {
    this.config.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Render a single element with optional animation progress
   */
  renderElement(element: DrawingElement, progress: number = 1): void {
    const { ctx } = this.config;

    if (progress <= 0) return;

    // Save context state
    ctx.save();

    // Apply view transform
    this.applyViewTransform();

    try {
      switch (element.type) {
        case "path":
          this.renderPath(element, progress);
          break;
        case "highlighter":
          this.renderHighlighter(element, progress);
          break;
        case "rectangle":
          this.renderRectangle(element, progress);
          break;
        case "ellipse":
          this.renderEllipse(element, progress);
          break;
        case "line":
          this.renderLine(element, progress);
          break;
        case "arrow":
          this.renderArrow(element, progress);
          break;
        case "text":
          this.renderText(element, progress);
          break;
        default:
          console.warn(`Unknown element type: ${element.type}`);
      }
    } catch (error) {
      console.error(`Error rendering element ${element.id}:`, error);
    }

    // Restore context state
    ctx.restore();
  }

  /**
   * Render path element with progressive drawing
   */
  private renderPath(element: DrawingElement, progress: number): void {
    const { ctx } = this.config;
    
    if (!element.points || element.points.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = element.style.stroke;
    ctx.lineWidth = element.style.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Calculate how many points to draw based on progress
    const totalPoints = element.points.length;
    const pointsToShow = Math.ceil(totalPoints * progress);

    if (pointsToShow > 0) {
      const firstPoint = element.points[0];
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < pointsToShow && i < totalPoints; i++) {
        const point = element.points[i];
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    }
  }

  /**
   * Render highlighter with transparency and progressive drawing
   */
  private renderHighlighter(element: DrawingElement, progress: number): void {
    const { ctx } = this.config;
    
    if (!element.points || element.points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = element.opacity || 0.3;
    
    // Use the same rendering as path but with different opacity
    this.renderPath(element, progress);
    
    ctx.restore();
  }

  /**
   * Render rectangle with progressive animation (boundary first, then fill)
   */
  private renderRectangle(element: DrawingElement, progress: number): void {
    const { ctx } = this.config;
    
    const x = element.x;
    const y = element.y;
    const width = element.width || 100;
    const height = element.height || 100;

    // Progressive animation: boundary first (75%), then fill (25%)
    if (progress > 0) {
      // Draw boundary
      ctx.strokeStyle = element.style.stroke;
      ctx.lineWidth = element.style.strokeWidth;
      
      if (progress <= 0.75) {
        // Animate boundary drawing
        const boundaryProgress = progress / 0.75;
        this.drawPartialRectangleBoundary(x, y, width, height, boundaryProgress);
      } else {
        // Full boundary
        ctx.strokeRect(x, y, width, height);
        
        // Animate fill
        if (element.style.fill && element.style.fill !== "transparent") {
          const fillProgress = (progress - 0.75) / 0.25;
          ctx.fillStyle = element.style.fill;
          ctx.save();
          ctx.globalAlpha = fillProgress;
          ctx.fillRect(x, y, width, height);
          ctx.restore();
        }
      }
    }
  }

  /**
   * Draw partial rectangle boundary for animation
   */
  private drawPartialRectangleBoundary(x: number, y: number, width: number, height: number, progress: number): void {
    const { ctx } = this.config;
    
    ctx.beginPath();
    
    const perimeter = 2 * (width + height);
    const drawLength = perimeter * progress;
    let currentLength = 0;
    
    // Start from top-left, go clockwise
    if (drawLength > currentLength) {
      // Top edge
      const topLength = Math.min(width, drawLength - currentLength);
      ctx.moveTo(x, y);
      ctx.lineTo(x + topLength, y);
      currentLength += topLength;
    }
    
    if (drawLength > currentLength) {
      // Right edge
      const rightLength = Math.min(height, drawLength - currentLength);
      if (currentLength === width) ctx.moveTo(x + width, y);
      ctx.lineTo(x + width, y + rightLength);
      currentLength += rightLength;
    }
    
    if (drawLength > currentLength) {
      // Bottom edge
      const bottomLength = Math.min(width, drawLength - currentLength);
      if (currentLength === width + height) ctx.moveTo(x + width, y + height);
      ctx.lineTo(x + width - bottomLength, y + height);
      currentLength += bottomLength;
    }
    
    if (drawLength > currentLength) {
      // Left edge
      const leftLength = Math.min(height, drawLength - currentLength);
      if (currentLength === 2 * width + height) ctx.moveTo(x, y + height);
      ctx.lineTo(x, y + height - leftLength);
    }
    
    ctx.stroke();
  }

  /**
   * Render ellipse with progressive animation
   */
  private renderEllipse(element: DrawingElement, progress: number): void {
    const { ctx } = this.config;
    
    const centerX = element.x + (element.width || 100) / 2;
    const centerY = element.y + (element.height || 100) / 2;
    const radiusX = (element.width || 100) / 2;
    const radiusY = (element.height || 100) / 2;

    ctx.strokeStyle = element.style.stroke;
    ctx.lineWidth = element.style.strokeWidth;

    if (progress <= 0.75) {
      // Animate boundary
      const boundaryProgress = progress / 0.75;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI * boundaryProgress);
      ctx.stroke();
    } else {
      // Full boundary
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Animate fill
      if (element.style.fill && element.style.fill !== "transparent") {
        const fillProgress = (progress - 0.75) / 0.25;
        ctx.fillStyle = element.style.fill;
        ctx.save();
        ctx.globalAlpha = fillProgress;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /**
   * Render line with progressive drawing
   */
  private renderLine(element: DrawingElement, progress: number): void {
    const { ctx } = this.config;
    
    if (!element.points || element.points.length < 2) return;

    ctx.strokeStyle = element.style.stroke;
    ctx.lineWidth = element.style.strokeWidth;
    ctx.lineCap = "round";

    const startPoint = element.points[0];
    const endPoint = element.points[1];
    
    const currentEndX = startPoint.x + (endPoint.x - startPoint.x) * progress;
    const currentEndY = startPoint.y + (endPoint.y - startPoint.y) * progress;

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(currentEndX, currentEndY);
    ctx.stroke();
  }

  /**
   * Render arrow with progressive drawing
   */
  private renderArrow(element: DrawingElement, progress: number): void {
    // First render the line
    this.renderLine(element, progress);
    
    // Add arrowhead when line is mostly complete
    if (progress > 0.8 && element.points && element.points.length >= 2) {
      this.drawArrowhead(element.points[0], element.points[1], progress);
    }
  }

  /**
   * Draw arrowhead
   */
  private drawArrowhead(start: {x: number, y: number}, end: {x: number, y: number}, progress: number): void {
    const { ctx } = this.config;
    
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLength = 15;
    const headAngle = Math.PI / 6;
    
    const arrowProgress = (progress - 0.8) / 0.2; // Arrowhead appears in last 20%
    
    if (arrowProgress > 0) {
      ctx.save();
      ctx.globalAlpha = arrowProgress;
      
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - headAngle),
        end.y - headLength * Math.sin(angle - headAngle)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + headAngle),
        end.y - headLength * Math.sin(angle + headAngle)
      );
      ctx.stroke();
      
      ctx.restore();
    }
  }

  /**
   * Render text with fade-in animation
   */
  private renderText(element: DrawingElement, progress: number): void {
    const { ctx } = this.config;
    
    if (!element.text) return;

    ctx.save();
    ctx.globalAlpha = progress;
    ctx.fillStyle = element.style.stroke;
    ctx.font = `${element.style.fontSize || 16}px ${element.style.fontFamily || 'Arial'}`;
    ctx.fillText(element.text, element.x, element.y);
    ctx.restore();
  }

  /**
   * Render multiple elements with their individual progress
   */
  renderElements(elements: DrawingElement[]): void {
    this.clear();
    
    for (const element of elements) {
      const progress = this.animationState.elementProgress.get(element.id) || 0;
      this.renderElement(element, progress);
    }
  }

  /**
   * Update animation state
   */
  updateAnimation(elementProgress: Map<string, number>, globalProgress: number): void {
    this.animationState.elementProgress = new Map(elementProgress);
    this.animationState.progress = globalProgress;
    this.animationState.currentTimestamp = Date.now();
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    const { canvas } = this.config;
    return { width: canvas.width, height: canvas.height };
  }

  /**
   * Resize canvas (for responsive behavior)
   */
  resize(width: number, height: number): void {
    const { canvas } = this.config;
    canvas.width = width;
    canvas.height = height;
    console.log(`Canvas resized to: ${width}x${height}`);
  }
}
