// Test script for Native Replay System
// Validates that small shapes render without zoom issues

import type { DrawingElement } from "../contexts/DrawingContext";
import { NativeCanvasRenderer } from "./NativeCanvasRenderer";
import { ProgressiveAnimationEngine } from "./ProgressiveAnimationEngine";
import { NativeReplaySystem } from "./NativeReplaySystem";

/**
 * Create test elements - small shapes that should be visible without zoom
 */
export function createTestElements(): DrawingElement[] {
  const baseTimestamp = Date.now();
  
  return [
    // Small rectangle (50x30) near center
    {
      id: "test-rect-1",
      type: "rectangle",
      x: 375,
      y: 285,
      width: 50,
      height: 30,
      style: {
        stroke: "#ff0000",
        strokeWidth: 2,
        fill: "transparent"
      },
      layerId: "default",
      timestamp: baseTimestamp
    },
    
    // Small circle (20px radius) near center
    {
      id: "test-ellipse-1", 
      type: "ellipse",
      x: 390,
      y: 330,
      width: 40,
      height: 40,
      style: {
        stroke: "#00ff00",
        strokeWidth: 2,
        fill: "rgba(0, 255, 0, 0.2)"
      },
      layerId: "default",
      timestamp: baseTimestamp + 1000
    },
    
    // Small path (drawing stroke)
    {
      id: "test-path-1",
      type: "path",
      x: 350,
      y: 250,
      points: [
        { x: 350, y: 250 },
        { x: 355, y: 255 },
        { x: 360, y: 250 },
        { x: 365, y: 255 },
        { x: 370, y: 250 }
      ],
      style: {
        stroke: "#0000ff",
        strokeWidth: 3
      },
      layerId: "default",
      timestamp: baseTimestamp + 2000
    },
    
    // Small line
    {
      id: "test-line-1",
      type: "line",
      x: 400,
      y: 250,
      points: [
        { x: 400, y: 250 },
        { x: 450, y: 280 }
      ],
      style: {
        stroke: "#ff00ff",
        strokeWidth: 2
      },
      layerId: "default",
      timestamp: baseTimestamp + 3000
    },
    
    // Text element
    {
      id: "test-text-1",
      type: "text",
      x: 350,
      y: 380,
      text: "Test",
      style: {
        stroke: "#000000",
        strokeWidth: 1,
        fontSize: 16,
        fontFamily: "Arial"
      },
      layerId: "default",
      timestamp: baseTimestamp + 4000
    }
  ];
}

/**
 * Test that creates a canvas and validates rendering
 */
export function testNativeReplaySystem(): Promise<{ success: boolean; errors: string[] }> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    let success = true;

    try {
      // Create test canvas
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      
      // Test elements
      const testElements = createTestElements();
      console.log(`Testing with ${testElements.length} small elements`);
      
      // Native replay config - auto-scale should fit content properly
      const config = {
        mode: "chronological" as const,
        showPageTransitions: false,
        transitionDuration: 500,
        transitionType: "fade" as const,
        showPageIndicators: false,
        autoScale: true, // This should prevent zoom issues
      };
      
      // Animation settings
      const animationSettings = {
        penStrokes: {
          elementDuration: 500,
          groupDelay: 100,
          easing: "ease-out",
          trueSpeed: false,
          trueSpeedRate: 200,
        },
        shapes: {
          elementDuration: 800,
          groupDelay: 150,
          easing: "ease-out",
        },
        libraryObjects: {
          elementDuration: 600,
          groupDelay: 100,
          easing: "ease-out",
        },
      };
      
      // Initialize system
      const replaySystem = new NativeReplaySystem(canvas, config, animationSettings);
      replaySystem.loadElements(testElements);
      
      // Get stats to verify setup
      const stats = replaySystem.getStats();
      console.log("Replay system stats:", stats);
      
      // Validate viewport - should not be extremely zoomed
      if (stats.viewport.scale < 0.1) {
        errors.push(`Viewport scale too small: ${stats.viewport.scale} (potential zoom out issue)`);
        success = false;
      }
      
      if (stats.viewport.scale > 10) {
        errors.push(`Viewport scale too large: ${stats.viewport.scale} (potential zoom in issue)`);
        success = false;
      }
      
      // Validate elements are loaded
      if (stats.elements !== testElements.length) {
        errors.push(`Element count mismatch: expected ${testElements.length}, got ${stats.elements}`);
        success = false;
      }
      
      // Test animation start (should not throw errors)
      replaySystem.startReplay(
        (progress) => {
          // Progress should be reasonable (0-100)
          if (progress < 0 || progress > 100) {
            errors.push(`Invalid progress value: ${progress}`);
            success = false;
          }
        },
        () => {
          console.log("Test animation completed successfully");
          resolve({ success, errors });
        }
      );
      
      // Stop after a short time to complete test
      setTimeout(() => {
        replaySystem.stop();
        if (success && errors.length === 0) {
          console.log("✅ Native replay system test PASSED");
        } else {
          console.log("❌ Native replay system test FAILED");
        }
        resolve({ success, errors });
      }, 2000);
      
    } catch (error) {
      console.error("Test failed with exception:", error);
      errors.push(`Exception during test: ${error}`);
      resolve({ success: false, errors });
    }
  });
}

/**
 * Manual validation helper - creates elements that should be clearly visible
 */
export function createVisibilityTestElements(): DrawingElement[] {
  // Create elements that are 5% of a typical canvas size
  // These should be easily visible without zoom issues
  const canvasWidth = 800;
  const canvasHeight = 600;
  const elementSize = Math.min(canvasWidth, canvasHeight) * 0.05; // 5% of smaller dimension
  
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  return [
    {
      id: "visibility-test-square",
      type: "rectangle",
      x: centerX - elementSize/2,
      y: centerY - elementSize/2,
      width: elementSize,
      height: elementSize,
      style: {
        stroke: "#ff0000",
        strokeWidth: 3,
        fill: "rgba(255, 0, 0, 0.2)"
      },
      layerId: "default",
      timestamp: Date.now()
    }
  ];
}

/**
 * Test specifically for the zoom issue - validates coordinates
 */
export function validateCoordinateSystem(elements: DrawingElement[]): { 
  hasCoordinateIssues: boolean; 
  recommendations: string[] 
} {
  const recommendations: string[] = [];
  let hasCoordinateIssues = false;
  
  // Check for extremely large or small coordinates
  for (const element of elements) {
    if (Math.abs(element.x) > 10000 || Math.abs(element.y) > 10000) {
      hasCoordinateIssues = true;
      recommendations.push(`Element ${element.id} has extreme coordinates: (${element.x}, ${element.y})`);
    }
    
    if (element.points) {
      for (const point of element.points) {
        if (Math.abs(point.x) > 10000 || Math.abs(point.y) > 10000) {
          hasCoordinateIssues = true;
          recommendations.push(`Element ${element.id} has extreme point coordinates`);
          break;
        }
      }
    }
  }
  
  if (!hasCoordinateIssues) {
    recommendations.push("✅ Coordinate system looks healthy");
  }
  
  return { hasCoordinateIssues, recommendations };
}
