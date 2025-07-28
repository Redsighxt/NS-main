import React from "react";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Monitor } from "lucide-react";
import { NativeReplayWindow } from "./NativeReplayWindow";
import { AdvancedReplayWindow } from "./AdvancedReplayWindow";

/**
 * Replay Studio - Combined interface with Native (no zoom) and Legacy (SVG) replay systems
 */
export function ReplayStudio() {
  return (
    <AnimatedFloatingPanel
      id="replay-studio"
      title="🎬 Replay Studio"
      icon={Monitor}
      defaultPosition={{
        x: typeof window !== "undefined" ? window.innerWidth - 500 : 900,
        y: 150,
      }}
      defaultSize={{ width: 650, height: 850 }}
    >
      <Tabs defaultValue="native" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="native" className="text-sm">
            🚀 Native Canvas (No Zoom!)
          </TabsTrigger>
          <TabsTrigger value="legacy" className="text-sm">
            📄 Legacy SVG System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="native" className="mt-4 space-y-0">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded-lg border mb-4">
            <div className="text-sm">
              <strong className="text-green-700 dark:text-green-300">
                ✨ New Native System
              </strong>
              <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                Direct canvas rendering • Zero zoom issues • Perfect for small
                shapes
              </div>
            </div>
          </div>
          <NativeReplayWindow />
        </TabsContent>

        <TabsContent value="legacy" className="mt-4 space-y-0">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border mb-4">
            <div className="text-sm">
              <strong className="text-orange-700 dark:text-orange-300">
                ⚠️ Legacy System
              </strong>
              <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                SVG-based • May have zoom issues • Being replaced by Native
                system
              </div>
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <AdvancedReplayWindow />
          </div>
        </TabsContent>
      </Tabs>
    </AnimatedFloatingPanel>
  );
}
