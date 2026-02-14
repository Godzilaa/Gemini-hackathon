
import { Sidebar } from "@/components/sidebar/Sidebar"
import Map from "@/components/maps"


export default function Home() {
  return (
    <div className="h-screen bg-white">
      <Sidebar />
      <main className="h-screen md:ml-[320px] lg:ml-[384px]">
        <Map />
      </main>
    </div>
  )
}
