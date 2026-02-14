"use client"

import dynamic from "next/dynamic";
import { use } from "react";

const Map = dynamic(() => import("@/components/maps"), { ssr: false });

export default function Home() {
  return (
    <main>
      <Map />
    </main>
  );
}
