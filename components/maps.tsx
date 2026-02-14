"use client";

import { GoogleMap, useLoadScript, Marker, DirectionsRenderer, InfoWindow } from "@react-google-maps/api";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useApp, useMapMarkers, useCurrentLocation } from '@/contexts/AppContext';

const libraries: ["places"] = ["places"];

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

const getMarkerIcons = () => {
  if (typeof window === 'undefined' || !window.google) {
    return {};
  }
  
  return {
    food: {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#00FF00" stroke="#000" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" font-size="14" fill="#000">🍽️</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
    },
    hotel: {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#0066FF" stroke="#000" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" font-size="14" fill="#FFF">🏨</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
    },
    attraction: {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#FF0000" stroke="#000" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" font-size="14" fill="#FFF">📍</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
    },
    warning: {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#FFA500" stroke="#000" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" font-size="14" fill="#000">⚠️</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
    },
    route: {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#800080" stroke="#000" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" font-size="14" fill="#FFF">🛣️</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
    },
  };
};

export default function Map() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const { state } = useApp();
  const markers = useMapMarkers();
  const currentLocation = useCurrentLocation();
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerIcons, setMarkerIcons] = useState<any>({});

  const center = useMemo(
    () => currentLocation || { lat: 19.0760, lng: 72.8777 },
    [currentLocation]
  );

  // Calculate directions when destination is set
  useEffect(() => {
    if (isLoaded && state.selectedDestination && currentLocation && window.google) {
      const directionsService = new google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: currentLocation,
          destination: state.selectedDestination,
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error("Directions request failed:", status);
            setDirections(null);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [isLoaded, state.selectedDestination, currentLocation]);

  // Fit map bounds to show all markers
  useEffect(() => {
    if (map && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      // Add current location to bounds
      if (currentLocation) {
        bounds.extend(currentLocation);
      }
      
      // Add all markers to bounds
      markers.forEach(marker => {
        bounds.extend(marker.position);
      });
      
      // Add destination to bounds
      if (state.selectedDestination) {
        bounds.extend(state.selectedDestination);
      }
      
      map.fitBounds(bounds, 50);
    }
  }, [map, markers, currentLocation, state.selectedDestination]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    setMarkerIcons(getMarkerIcons());
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const calculateRoute = useCallback((origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) => {
    if (!isLoaded || !window.google) return;
    
    const directionsService = new google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error("Directions request failed:", status);
          setDirections(null);
        }
      }
    );
  }, [isLoaded]);

  if (!isLoaded) return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <div className="text-lg font-medium">Loading Map...</div>
      </div>
    </div>
  );

  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        zoom={13}
        center={center}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="12" fill="#4285F4" stroke="#FFF" stroke-width="3"/>
                  <circle cx="16" cy="16" r="6" fill="#FFF"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
            }}
            title="Your Location"
          />
        )}

        {/* Map Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            title={marker.title}
            icon={markerIcons[marker.type] || markerIcons.attraction}
            onClick={() => {
              setSelectedMarker(marker.id);
              // Show route to this marker if it's a food/restaurant marker
              if (marker.type === 'food' && currentLocation) {
                calculateRoute(currentLocation, marker.position);
              }
            }}
          />
        ))}

        {/* Destination Marker */}
        {state.selectedDestination && (
          <Marker
            position={state.selectedDestination}
            icon={markerIcons.attraction}
            title={state.selectedDestination.name}
          />
        )}

        {/* Directions */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true, // We show custom markers
              polylineOptions: {
                strokeColor: "#4285F4",
                strokeWeight: 4,
                strokeOpacity: 0.8,
              },
            }}
          />
        )}

        {/* Info Windows */}
        {selectedMarker && (
          <InfoWindow
            position={markers.find(m => m.id === selectedMarker)?.position}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold text-sm mb-1">
                {markers.find(m => m.id === selectedMarker)?.title}
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                {markers.find(m => m.id === selectedMarker)?.description}
              </p>
              {markers.find(m => m.id === selectedMarker)?.type === 'food' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const marker = markers.find(m => m.id === selectedMarker);
                      if (marker && currentLocation) {
                        calculateRoute(currentLocation, marker.position);
                      }
                    }}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    🚗 Show Route
                  </button>
                  <button
                    onClick={() => {
                      const marker = markers.find(m => m.id === selectedMarker);
                      if (marker) {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${marker.position.lat},${marker.position.lng}`;
                        window.open(url, '_blank');
                      }
                    }}
                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                  >
                    🗺️ Navigate
                  </button>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white border-2 border-black p-2 space-y-2">
        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((position) => {
                const newLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                if (map) {
                  map.panTo(newLocation);
                  map.setZoom(15);
                }
              });
            }
          }}
          className="block w-full p-2 text-xs font-medium bg-white border border-gray-300 hover:bg-gray-50"
        >
          📍 My Location
        </button>
        
        {state.selectedDestination && (
          <div className="text-xs p-2 bg-blue-50 border border-blue-200">
            <div className="font-medium">Destination:</div>
            <div className="text-gray-600">{state.selectedDestination.name}</div>
            {directions && (
              <div className="mt-1 text-gray-500">
                {directions.routes[0]?.legs[0]?.distance?.text} • {" "}
                {directions.routes[0]?.legs[0]?.duration?.text}
              </div>
            )}
          </div>
        )}
        
        {markers.length > 0 && (
          <div className="text-xs p-2 bg-green-50 border border-green-200">
            <div className="font-medium">{markers.length} Points of Interest</div>
            <div className="space-y-1 mt-1">
              {Object.entries(
                markers.reduce((acc, marker) => {
                  acc[marker.type] = (acc[marker.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="flex justify-between text-gray-600">
                  <span className="capitalize">{type}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
