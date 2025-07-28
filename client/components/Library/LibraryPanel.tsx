import React, { useState, useRef } from "react";
import { useLibrary } from "../../contexts/LibraryContext";
import { useDrawing } from "../../contexts/DrawingContext";
import { addLibraryComponentToCanvas } from "../../lib/excalidrawRenderer";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import {
  Library,
  Plus,
  Search,
  Pin,
  PinOff,
  Upload,
  Download,
  Grid3X3,
  Clock,
  Star,
  StarOff,
  Trash2,
  ExternalLink,
  FileText,
  Image,
  Play,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type {
  ExcalidrawLibraryComponent,
  ExcalidrawLibrary,
} from "../../contexts/LibraryContext";
import { loadSampleLibrary } from "./SampleLibrary";

interface LibraryComponentCardProps {
  component: ExcalidrawLibraryComponent;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onAddToCanvas: () => void;
  library: ExcalidrawLibrary;
}

function LibraryComponentCard({
  component,
  isPinned,
  onPin,
  onUnpin,
  onAddToCanvas,
  library,
}: LibraryComponentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative group border rounded-lg p-3 transition-all duration-200 cursor-pointer bg-background hover:bg-muted/50",
        "hover:shadow-md hover:border-primary/20",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onAddToCanvas}
    >
      {/* Component Preview */}
      <div className="aspect-square bg-muted/20 rounded-lg mb-2 flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
        {component.svg ? (
          <div
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: component.svg }}
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <Grid3X3 className="w-8 h-8 mx-auto mb-1" />
            <span className="text-xs">Preview</span>
          </div>
        )}
      </div>

      {/* Component Info */}
      <div className="space-y-1">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-medium truncate pr-2">
            {component.name || `Component ${component.id.slice(-6)}`}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              isPinned ? onUnpin() : onPin();
            }}
          >
            {isPinned ? (
              <PinOff className="h-3 w-3 text-orange-500" />
            ) : (
              <Pin className="h-3 w-3" />
            )}
          </Button>
        </div>

        {component.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {component.description}
          </p>
        )}

        {/* Tags */}
        {component.tags && component.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {component.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-1.5 py-0.5"
              >
                {tag}
              </Badge>
            ))}
            {component.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                +{component.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Library Source */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{library.name}</span>
          {component.animationData && (
            <Play
              className="h-3 w-3 text-blue-500"
              title="Supports animation"
            />
          )}
        </div>
      </div>

      {/* Hover overlay with actions */}
      {isHovered && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <div className="flex space-x-2">
            <Button size="sm" variant="default" onClick={onAddToCanvas}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            {component.animationData && (
              <Button size="sm" variant="outline" title="Preview Animation">
                <Play className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LibraryListItemProps {
  library: ExcalidrawLibrary;
  onTogglePin: () => void;
  onRemove: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

function LibraryListItem({
  library,
  onTogglePin,
  onRemove,
  onSelect,
  isSelected,
}: LibraryListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/20 hover:bg-muted/30",
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <Library className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h3 className="text-sm font-medium truncate">{library.name}</h3>
          {library.pinned && (
            <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
          )}
        </div>

        {library.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {library.description}
          </p>
        )}

        <div className="flex items-center space-x-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {library.components.length} components
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(library.addedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-1 ml-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
        >
          {library.pinned ? (
            <StarOff className="h-4 w-4 text-yellow-500" />
          ) : (
            <Star className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LibraryPanel() {
  const { state, dispatch, getFilteredComponents, getPinnedComponents } =
    useLibrary();
  const { state: drawingState, dispatch: drawingDispatch } = useDrawing();
  const [activeTab, setActiveTab] = useState<"browse" | "manage">("browse");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to add component to canvas
  const addComponentToCanvas = (component: ExcalidrawLibraryComponent) => {
    // Calculate center position of viewport
    const canvasCenter = {
      x:
        (window.innerWidth / 2 - drawingState.viewTransform.x) /
        drawingState.viewTransform.scale,
      y:
        (window.innerHeight / 2 - drawingState.viewTransform.y) /
        drawingState.viewTransform.scale,
    };

    const libraryElement = addLibraryComponentToCanvas(
      component,
      canvasCenter,
      drawingState.activeLayerId,
    );

    drawingDispatch({ type: "ADD_ELEMENT", element: libraryElement });

    // Add to recent in library context
    dispatch({ type: "ADD_TO_RECENT", componentId: component.id });
  };

  const handleImportLibrary = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const libraryData = JSON.parse(content);

      dispatch({ type: "IMPORT_EXCALIDRAW_LIBRARY", libraryData });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to import library:", error);
      alert("Failed to import library. Please check the file format.");
    }
  };

  const filteredComponents = getFilteredComponents();
  const pinnedComponents = getPinnedComponents();

  // Group components by library in chronological order (most recent first)
  const componentsByLibrary = state.libraries
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((library) => ({
      library,
      components: library.components.filter(
        (component) =>
          !state.searchQuery ||
          component.name
            ?.toLowerCase()
            .includes(state.searchQuery.toLowerCase()) ||
          component.description
            ?.toLowerCase()
            .includes(state.searchQuery.toLowerCase()) ||
          component.tags?.some((tag) =>
            tag.toLowerCase().includes(state.searchQuery.toLowerCase()),
          ),
      ),
    }))
    .filter((group) => group.components.length > 0);

  return state.isLibraryPanelOpen ? (
    <AnimatedFloatingPanel
      id="library"
      title="Component Library"
      icon={Library}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 380 : 900,
        y: 120,
      }}
      defaultSize={{ width: 360, height: 700 }}
      onClose={() => dispatch({ type: "CLOSE_LIBRARY_PANEL" })}
    >
      <div className="flex flex-col h-full">
        {/* Header with tabs and actions */}
        <div className="space-y-3 pb-3 border-b">
          {/* Tabs */}
          <div className="flex space-x-1 bg-muted/20 p-1 rounded-lg">
            <Button
              variant={activeTab === "browse" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab("browse")}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Browse
            </Button>
            <Button
              variant={activeTab === "manage" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab("manage")}
            >
              <Library className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </div>

          {/* Import button */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import Library
            </Button>
            <Button variant="outline" size="sm" title="Export Libraries">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".excalidrawlib,.json"
            onChange={handleImportLibrary}
            className="hidden"
          />
        </div>

        {activeTab === "browse" ? (
          <div className="flex-1 flex flex-col space-y-3 pt-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={state.searchQuery}
                onChange={(e) =>
                  dispatch({ type: "SET_SEARCH_QUERY", query: e.target.value })
                }
                className="pl-10"
              />
              {state.searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => dispatch({ type: "CLEAR_SEARCH" })}
                >
                  ×
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {/* Pinned Section */}
                {pinnedComponents.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Pin className="h-4 w-4 text-orange-500" />
                      <Label className="text-sm font-medium text-orange-700 dark:text-orange-400">
                        Pinned Components
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {pinnedComponents.map((component) => {
                        const library = state.libraries.find((lib) =>
                          lib.components.some((c) => c.id === component.id),
                        )!;
                        return (
                          <LibraryComponentCard
                            key={component.id}
                            component={component}
                            library={library}
                            isPinned={true}
                            onPin={() =>
                              dispatch({
                                type: "PIN_COMPONENT",
                                componentId: component.id,
                              })
                            }
                            onUnpin={() =>
                              dispatch({
                                type: "UNPIN_COMPONENT",
                                componentId: component.id,
                              })
                            }
                            onAddToCanvas={() =>
                              addComponentToCanvas(component)
                            }
                          />
                        );
                      })}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )}

                {/* Components by Library (Chronological) */}
                {componentsByLibrary.length > 0 ? (
                  componentsByLibrary.map(({ library, components }) => (
                    <div key={library.id}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Library className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">
                            {library.name}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {components.length}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(library.addedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {components.map((component) => (
                          <LibraryComponentCard
                            key={component.id}
                            component={component}
                            library={library}
                            isPinned={state.pinnedComponents.includes(
                              component.id,
                            )}
                            onPin={() =>
                              dispatch({
                                type: "PIN_COMPONENT",
                                componentId: component.id,
                              })
                            }
                            onUnpin={() =>
                              dispatch({
                                type: "UNPIN_COMPONENT",
                                componentId: component.id,
                              })
                            }
                            onAddToCanvas={() =>
                              addComponentToCanvas(component)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Library className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {state.searchQuery
                        ? "No components match your search"
                        : "No libraries imported yet"}
                    </p>
                    <p className="text-xs mt-1">
                      {!state.searchQuery &&
                        "Import an Excalidraw library to get started"}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 pt-3">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Imported Libraries
                  </Label>
                  <Badge variant="outline">{state.libraries.length}</Badge>
                </div>

                {state.libraries.length > 0 ? (
                  <div className="space-y-2">
                    {state.libraries
                      .sort((a, b) => b.addedAt - a.addedAt)
                      .map((library) => (
                        <LibraryListItem
                          key={library.id}
                          library={library}
                          isSelected={state.selectedLibrary === library.id}
                          onSelect={() =>
                            dispatch({
                              type: "SET_SELECTED_LIBRARY",
                              libraryId: library.id,
                            })
                          }
                          onTogglePin={() =>
                            dispatch({
                              type: library.pinned
                                ? "UNPIN_LIBRARY"
                                : "PIN_LIBRARY",
                              libraryId: library.id,
                            })
                          }
                          onRemove={() => {
                            if (confirm(`Remove library "${library.name}"?`)) {
                              dispatch({
                                type: "REMOVE_LIBRARY",
                                libraryId: library.id,
                              });
                            }
                          }}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Library className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No libraries imported</p>
                    <div className="flex flex-col space-y-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Import Your First Library
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const sample = loadSampleLibrary();
                          dispatch({ type: "ADD_LIBRARY", library: sample });
                        }}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Load Sample Library
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </AnimatedFloatingPanel>
  ) : null;
}
