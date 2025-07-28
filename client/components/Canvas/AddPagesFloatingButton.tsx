import React, { useState } from "react";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { usePageMode } from "../../contexts/PageModeContext";
import { useDraggable } from "../../hooks/useDraggable";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Plus,
  FileText,
  Copy,
  Trash2,
  Edit3,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Pin,
  PinOff,
  Eraser,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export function AddPagesFloatingButton() {
  const { state: canvasSettings } = useCanvasSettings();
  const {
    state: pageState,
    addNewPage,
    switchToPage,
    deletePage,
    duplicatePage,
    renamePage,
    clearPage,
    togglePageHidden,
    togglePageLocked,
    togglePagePinned,
  } = usePageMode();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newPageName, setNewPageName] = useState("");

  const {
    elementRef,
    position,
    isDragging,
    handleMouseDown,
    handlePointerDown,
  } = useDraggable({
    initialPosition: {
      x: 20,
      y: window.innerHeight / 2 - 100,
    },
    constrainToViewport: true,
  });

  // Only show in page mode
  if (canvasSettings.canvasMode !== "page") {
    return null;
  }

  const currentPage = pageState.pages.find(
    (page) => page.id === pageState.currentPageId,
  );

  const handleAddPage = () => {
    const name = newPageName.trim() || undefined;
    addNewPage(name);
    setNewPageName("");
  };

  const handleEditStart = (page: any) => {
    setIsEditingName(page.id);
    setEditName(page.name);
  };

  const handleEditSave = (pageId: string) => {
    if (editName.trim()) {
      renamePage(pageId, editName.trim());
    }
    setIsEditingName(null);
    setEditName("");
  };

  const handleEditCancel = () => {
    setIsEditingName(null);
    setEditName("");
  };

  if (!isExpanded) {
    // Collapsed state - just the add button
    return (
      <div
        ref={elementRef as React.RefObject<HTMLDivElement>}
        className="fixed z-[9998]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div className="flex items-center space-x-2 bg-background/95 backdrop-blur-sm border border-border rounded-full px-3 py-2 shadow-lg">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded-lg"
            onMouseDown={handleMouseDown}
            onPointerDown={handlePointerDown}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Current page indicator */}
          <Badge variant="outline" className="text-xs">
            {currentPage ? currentPage.name : "No Page"}
          </Badge>

          {/* Add page button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => addNewPage()}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:scale-110 transition-all duration-200"
            title="Add New Page"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Expand button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(true)}
            className="h-8 w-8 rounded-full hover:bg-muted/50"
            title="Expand Page Manager"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Expanded state - full page manager
  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className="fixed z-[9998]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl min-w-[280px] max-w-[320px]">
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b border-border"
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
        >
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Page Manager</h3>
          </div>
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs">
              {pageState.pages.length} page
              {pageState.pages.length !== 1 ? "s" : ""}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6"
              title="Collapse"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
          {/* Add new page section */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="New page name..."
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddPage()}
                className="flex-1 text-sm h-8"
              />
              <Button size="sm" onClick={handleAddPage} className="px-3 h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Pages list */}
          <div className="space-y-2">
            {pageState.pages.map((page, index) => {
              const isActive = page.id === pageState.currentPageId;
              const isEditing = isEditingName === page.id;

              return (
                <div
                  key={page.id}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary/10 border-primary"
                      : "border-border hover:bg-muted/50",
                  )}
                  onClick={() => !isEditing && switchToPage(page.id)}
                >
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleEditSave(page.id);
                          if (e.key === "Escape") handleEditCancel();
                        }}
                        onBlur={() => handleEditSave(page.id)}
                        className="h-6 text-xs"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="space-y-1">
                        <div
                          className={cn(
                            "text-sm font-medium truncate flex items-center space-x-1",
                            !isActive && "text-muted-foreground",
                            page.hidden && "opacity-50",
                          )}
                        >
                          <span>{page.name}</span>
                          {isActive && (
                            <Badge variant="secondary" className="text-xs px-1">
                              Current
                            </Badge>
                          )}
                          {page.pinned && (
                            <Pin className="h-3 w-3 text-blue-500" />
                          )}
                          {page.locked && (
                            <Lock className="h-3 w-3 text-orange-500" />
                          )}
                          {page.hidden && (
                            <EyeOff className="h-3 w-3 text-gray-500" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {page.elements.length} element
                          {page.elements.length !== 1 ? "s" : ""}
                          {page.locked && " • Locked"}
                          {page.pinned && " • Pinned"}
                          {page.hidden && " • Hidden"}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex flex-wrap gap-1 max-w-[140px]">
                      {/* Page management buttons */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePageHidden(page.id);
                        }}
                        className={cn(
                          "h-5 w-5 p-0",
                          page.hidden
                            ? "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            : "hover:bg-blue-100 dark:hover:bg-blue-900",
                        )}
                        title={page.hidden ? "Show page" : "Hide page"}
                      >
                        {page.hidden ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePageLocked(page.id);
                        }}
                        className={cn(
                          "h-5 w-5 p-0",
                          page.locked
                            ? "text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900"
                            : "hover:bg-orange-100 dark:hover:bg-orange-900",
                        )}
                        title={page.locked ? "Unlock page" : "Lock page"}
                      >
                        {page.locked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePagePinned(page.id);
                        }}
                        className={cn(
                          "h-5 w-5 p-0",
                          page.pinned
                            ? "text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900"
                            : "hover:bg-blue-100 dark:hover:bg-blue-900",
                        )}
                        title={page.pinned ? "Unpin page" : "Pin page"}
                      >
                        {page.pinned ? (
                          <Pin className="h-3 w-3" />
                        ) : (
                          <PinOff className="h-3 w-3" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Clear all content from "${page.name}"?`,
                            )
                          ) {
                            clearPage(page.id);
                          }
                        }}
                        className="h-5 w-5 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                        title="Clear page content"
                      >
                        <Eraser className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(page);
                        }}
                        className="h-5 w-5 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                        title="Rename page"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicatePage(page.id);
                        }}
                        className="h-5 w-5 p-0 hover:bg-green-100 dark:hover:bg-green-900"
                        title="Duplicate page"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>

                      {pageState.pages.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${page.name}"?`)) {
                              deletePage(page.id);
                            }
                          }}
                          className="h-5 w-5 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                          title="Delete page"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Page Size: {pageState.pageSize.width} ×{" "}
                {pageState.pageSize.height}px
              </div>
              <div>
                Total Elements:{" "}
                {pageState.pages.reduce(
                  (sum, page) => sum + page.elements.length,
                  0,
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
