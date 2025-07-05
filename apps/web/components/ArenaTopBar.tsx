"use client"

import { Button } from "@/components/ui/button"
import { Link, LayoutGrid } from "lucide-react"

interface ArenaTopBarProps {
  spaceName: string
}

export default function ArenaTopBar({
  spaceName,
}: ArenaTopBarProps) {


  return (
    <div className="w-screen min-h-10 bg-gray-900">
      <div className="flex flex-row justify-between items-center px-4">
        {/* Left side - Back button */}
        <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={()=>{}}
              className="hover:bg-accent"
            >
              <Link className="h-4 w-4" />
            </Button>
        </div>

        {/* Center - Space name */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-sm font-semibold text-muted-foreground truncate max-w-xs">
            {spaceName}
          </h1>
        </div>

        {/* Right side - Settings button */}
        <div className="flex items-center">

            <Button
              variant="ghost"
              size="icon"
              onClick={()=>{}}
              className="hover:bg-accent"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  )
}
