
import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export function Sidebar() {
  return (
    <>
      {/* Mobile Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="border-2 border-black rounded-none">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-r-2 border-black w-[320px] sm:w-[384px] gap-0">
             <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-screen w-[320px] lg:w-[384px] border-r-2 border-black bg-white text-black fixed left-0 top-0">
        <SidebarContent />
      </div>
    </>
  )
}

function SidebarContent() {
  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-6 border-b-2 border-black">
        <h1 className="text-2xl font-bold uppercase tracking-tight mb-4">AI_SYSTEM_CORE</h1>
        <Button 
          variant="ghost" 
          className="w-full justify-start rounded-none border-2 border-black hover:bg-black hover:text-white transition-colors uppercase font-medium"
        >
          + New Chat
        </Button>
      </div>

      {/* Chat History / Feed */}
      <ScrollArea className="flex-1 w-full p-4">
        <div className="space-y-6">
          {/* Example Messages */}
          <div className="flex flex-col items-end gap-2">
            <div className="bg-black text-white p-3 max-w-[80%] text-sm font-medium">
              Initialize design system protocols.
            </div>
          </div>
          
          <div className="flex flex-col items-start gap-2">
            <div className="bg-white text-black border-2 border-black p-3 max-w-[90%] text-sm font-medium">
              SYSTEM READY. AWAITING INPUT.
            </div>
          </div>

           <div className="flex flex-col items-end gap-2">
            <div className="bg-black text-white p-3 max-w-[80%] text-sm font-medium">
              Show me the layout specs.
            </div>
          </div>
          
          <div className="flex flex-col items-start gap-2">
            <div className="bg-white text-black border-2 border-black p-3 max-w-[90%] text-sm font-medium">
              ACCESSING BLUEPRINTS...
              <br/>
              - WIDTH: 320PX
              <br/>
              - BORDER: 2PX SOLID #000
              <br/>
              - RADIUS: 0PX
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Input */}
      <div className="p-4 border-t-2 border-black bg-white">
        <div className="relative">
          <Textarea 
            placeholder="ENTER COMMAND..." 
            className="min-h-[100px] w-full rounded-none border-2 border-black p-3 resize-none focus-visible:ring-0 text-base font-mono uppercase placeholder:text-gray-500"
          />
          <Button 
            className="w-full mt-2 rounded-none border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-colors uppercase font-bold"
          >
            Send Command
          </Button>
        </div>
      </div>
    </div>
  )
}
