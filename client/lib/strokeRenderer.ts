// Smooth stroke rendering inspired by Excalidraw
// Includes pressure simulation, smoothing, and sloppiness

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface StrokeOptions {
  size: number;
  color: string;
  sloppiness: number; // 0 = perfect, 1 = slight, 2 = rough
  smoothing: number; // 0-1, how much to smooth the path
  pressure: boolean; // simulate pressure variation
}

// Sloppiness presets
export const SLOPPINESS_PRESETS = {
  architect: { value: 0, name: "Architect", description: "Perfect lines" },
  artist: { value: 1, name: "Artist", description: "Slight variation" },
  cartoonist: { value: 2, name: "Cartoonist", description: "Rough sketchy" },
};

// Simple noise function for sloppiness
function noise(x: number, y: number, seed: number = 1): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1; // -1 to 1
}

// Smooth a path using Catmull-Rom spline
function smoothPath(points: Point[], factor: number = 0.5): Point[] {
  if (points.length < 3) return points;

  const smoothed: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    // Add intermediate points for smoother curves (less aggressive)
    for (let t = 0; t <= 1; t += 0.25) {
      if (t === 0) continue; // Skip first point to avoid duplicates

      const x = p1.x + factor * t * (p2.x - p0.x);
      const y = p1.y + factor * t * (p2.y - p0.y);

      // Ensure valid coordinates
      if (isFinite(x) && isFinite(y)) {
        smoothed.push({
          x,
          y,
          pressure: p1.pressure || 1,
        });
      }
    }
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

// Add sloppiness to a path
function addSloppiness(
  points: Point[],
  amount: number,
  seed: number = 0,
): Point[] {
  if (amount === 0) return points;

  return points.map((point, i) => {
    const offset = amount * 2; // max offset
    const noiseX = noise(point.x * 0.01, point.y * 0.01, seed) * offset;
    const noiseY = noise(point.x * 0.01, point.y * 0.01, seed + 1000) * offset;

    return {
      x: point.x + noiseX,
      y: point.y + noiseY,
      pressure: point.pressure,
    };
  });
}

// Simulate pressure variation
function addPressureVariation(points: Point[]): Point[] {
  return points.map((point, i) => {
    const startFade = Math.min(i / 3, 1); // fade in
    const endFade = Math.min((points.length - i) / 5, 1); // fade out
    const middleVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    const pressure = startFade * endFade * middleVariation;

    return {
      ...point,
      pressure: Math.max(0.1, Math.min(1, pressure)),
    };
  });
}

// Draw a smooth stroke with all enhancements
export function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  options: StrokeOptions,
): void {
  if (points.length < 2) return;

  // Validate points
  const validPoints = points.filter(
    (p) =>
      isFinite(p.x) &&
      isFinite(p.y) &&
      p.x !== null &&
      p.y !== null &&
      p.x !== undefined &&
      p.y !== undefined,
  );

  if (validPoints.length < 2) return;

  let processedPoints = [...validPoints];

  // Add pressure variation if enabled
  if (options.pressure) {
    processedPoints = addPressureVariation(processedPoints);
  }

  // Smooth the path
  if (options.smoothing > 0) {
    processedPoints = smoothPath(processedPoints, options.smoothing);
  }

  // Add sloppiness
  if (options.sloppiness > 0) {
    processedPoints = addSloppiness(processedPoints, options.sloppiness, 42);
  }

  ctx.save();
  ctx.strokeStyle = options.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (
    options.pressure &&
    processedPoints.some((p) => p.pressure !== undefined)
  ) {
    // Variable width stroke
    drawVariableWidthStroke(ctx, processedPoints, options.size);
  } else {
    // Simple smooth stroke
    ctx.lineWidth = options.size;
    drawBasicSmoothStroke(ctx, processedPoints);
  }

  ctx.restore();
}

function drawBasicSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
): void {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Use quadratic curves for smoothness
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    // Final point
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2];
    ctx.quadraticCurveTo(
      secondLastPoint.x,
      secondLastPoint.y,
      lastPoint.x,
      lastPoint.y,
    );
  }

  ctx.stroke();
}

function drawVariableWidthStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  baseSize: number,
): void {
  if (points.length < 2) return;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    const pressure = current.pressure || 1;
    const nextPressure = next.pressure || 1;

    const currentWidth = baseSize * pressure;
    const nextWidth = baseSize * nextPressure;

    // Draw tapered line segment
    drawTaperedLine(ctx, current, next, currentWidth, nextWidth);
  }
}

function drawTaperedLine(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  startWidth: number,
  endWidth: number,
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return;

  // Perpendicular vector
  const perpX = -dy / length;
  const perpY = dx / length;

  // Create quad points
  const startLeft = {
    x: start.x + (perpX * startWidth) / 2,
    y: start.y + (perpY * startWidth) / 2,
  };
  const startRight = {
    x: start.x - (perpX * startWidth) / 2,
    y: start.y - (perpY * startWidth) / 2,
  };
  const endLeft = {
    x: end.x + (perpX * endWidth) / 2,
    y: end.y + (perpY * endWidth) / 2,
  };
  const endRight = {
    x: end.x - (perpX * endWidth) / 2,
    y: end.y - (perpY * endWidth) / 2,
  };

  // Draw the tapered quad
  ctx.beginPath();
  ctx.moveTo(startLeft.x, startLeft.y);
  ctx.lineTo(endLeft.x, endLeft.y);
  ctx.lineTo(endRight.x, endRight.y);
  ctx.lineTo(startRight.x, startRight.y);
  ctx.closePath();
  ctx.fill();
}

// Quick function to convert basic points to enhanced points
export function enhancePoints(
  basicPoints: { x: number; y: number }[],
): Point[] {
  return basicPoints.map((p) => ({ x: p.x, y: p.y, pressure: 1 }));
}
