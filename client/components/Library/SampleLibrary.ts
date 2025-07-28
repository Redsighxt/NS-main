import type { ExcalidrawLibrary } from "../../contexts/LibraryContext";

// Sample library with basic components for testing
export const sampleLibrary: ExcalidrawLibrary = {
  id: "sample-library-1",
  name: "Basic Shapes",
  description: "A collection of basic geometric shapes and icons",
  version: "1.0.0",
  author: "Drawing App",
  tags: ["basic", "shapes", "geometry"],
  addedAt: Date.now() - 86400000, // 1 day ago
  source: "manual",
  pinned: false,
  components: [
    {
      id: "rect-rounded",
      status: "published",
      created: Date.now() - 86400000,
      name: "Rounded Rectangle",
      description: "A rectangle with rounded corners",
      tags: ["rectangle", "rounded", "basic"],
      elements: [
        {
          type: "rectangle",
          version: 1,
          versionNonce: 123456789,
          isDeleted: false,
          id: "rect-rounded-1",
          fillStyle: "hachure",
          strokeWidth: 2,
          strokeStyle: "solid",
          roughness: 1,
          opacity: 1,
          angle: 0,
          x: 0,
          y: 0,
          strokeColor: "#1e1e1e",
          backgroundColor: "transparent",
          width: 100,
          height: 60,
          seed: 1,
          groupIds: [],
          frameId: null,
          roundness: { type: 3, value: 12 },
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
        },
      ],
      animationData: {
        duration: 800,
        delay: 0,
        easing: "ease-out",
      },
    },
    {
      id: "arrow-curved",
      status: "published",
      created: Date.now() - 86400000,
      name: "Curved Arrow",
      description: "An arrow with a smooth curve",
      tags: ["arrow", "curved", "direction"],
      elements: [
        {
          type: "arrow",
          version: 1,
          versionNonce: 123456790,
          isDeleted: false,
          id: "arrow-curved-1",
          fillStyle: "hachure",
          strokeWidth: 2,
          strokeStyle: "solid",
          roughness: 1,
          opacity: 1,
          angle: 0,
          x: 0,
          y: 0,
          strokeColor: "#1971c2",
          backgroundColor: "transparent",
          width: 120,
          height: 80,
          seed: 2,
          groupIds: [],
          frameId: null,
          roundness: null,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          // Custom points for the arrow
          points: [
            { x: 10, y: 40 },
            { x: 110, y: 40 },
          ],
          // Control points for curve
          controlPoints: [
            { x: 40, y: 10 },
            { x: 80, y: 70 },
          ],
        },
      ],
      animationData: {
        duration: 1200,
        delay: 100,
        easing: "ease-in-out",
      },
    },
    {
      id: "icon-star",
      status: "published",
      created: Date.now() - 86400000,
      name: "Star Icon",
      description: "A five-pointed star",
      tags: ["star", "icon", "favorite"],
      elements: [
        {
          type: "path",
          version: 1,
          versionNonce: 123456791,
          isDeleted: false,
          id: "star-path-1",
          fillStyle: "solid",
          strokeWidth: 2,
          strokeStyle: "solid",
          roughness: 0.5,
          opacity: 1,
          angle: 0,
          x: 0,
          y: 0,
          strokeColor: "#f08c00",
          backgroundColor: "#ffd43b",
          width: 80,
          height: 80,
          seed: 3,
          groupIds: [],
          frameId: null,
          roundness: null,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          // Star path points
          points: [
            { x: 40, y: 5 }, // top
            { x: 50, y: 30 }, // inner top right
            { x: 75, y: 30 }, // outer top right
            { x: 55, y: 50 }, // inner bottom right
            { x: 65, y: 75 }, // outer bottom right
            { x: 40, y: 60 }, // inner bottom
            { x: 15, y: 75 }, // outer bottom left
            { x: 25, y: 50 }, // inner bottom left
            { x: 5, y: 30 }, // outer top left
            { x: 30, y: 30 }, // inner top left
          ],
        },
      ],
      svg: `<svg viewBox="0 0 80 80"><path d="M40,5 L50,30 L75,30 L55,50 L65,75 L40,60 L15,75 L25,50 L5,30 L30,30 Z" fill="#ffd43b" stroke="#f08c00" stroke-width="2"/></svg>`,
      animationData: {
        duration: 1000,
        delay: 0,
        easing: "ease-out",
      },
    },
  ],
};

// Function to load sample library
export function loadSampleLibrary(): ExcalidrawLibrary {
  return {
    ...sampleLibrary,
    id: `sample-${Date.now()}`,
    addedAt: Date.now(),
  };
}
