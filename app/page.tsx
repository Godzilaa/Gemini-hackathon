'use client';

import { Sidebar } from "@/components/sidebar/Sidebar"
import Map from "@/components/maps"
import { AppProvider } from "@/contexts/AppContext"

export default function Home() {
  return (
    <AppProvider>
      <div className="h-screen bg-white">
        <Sidebar />
        <main className="h-screen md:ml-[320px] lg:ml-[384px]">
          <Map />
        </main>
      </div>
    </AppProvider>
  )
}