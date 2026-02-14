"use client";

import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { useMemo } from "react";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

export default function Map() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ["places"],
  });

  const center = useMemo(
    () => ({
      lat: 19.0760, // Mumbai default
      lng: 72.8777,
    }),
    []
  );

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      zoom={13}
      center={center}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
      }}
    />
  );
}
