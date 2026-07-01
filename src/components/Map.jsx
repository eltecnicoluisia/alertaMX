import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for Hazards using HTML and CSS classes
const getHazardIcon = (type) => {
  return new L.DivIcon({
    className: 'custom-marker',
    html: `<div class="hazard-marker ${type}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function MapController({ activeEvents }) {
  const map = useMap();

  useEffect(() => {
    if (activeEvents.length > 0) {
      const latest = activeEvents[0];
      map.flyTo([latest.lat, latest.lng], 6, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    } else {
      map.flyTo([23.6345, -102.5528], 5);
    }
  }, [activeEvents, map]);

  return null;
}

export default function EarthquakeMap({ activeEvents, userLocation }) {
  const defaultCities = [
    { name: 'Guadalajara, Jalisco', lat: 20.659698, lng: -103.349609 },
    { name: 'Mexicali, Baja California', lat: 32.624538, lng: -115.452262 }
  ];

  return (
    <div className="map-container">
      <MapContainer 
        center={[23.6345, -102.5528]} 
        zoom={5} 
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        
        {/* Map Layers Control (Top Right) */}
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Modo Oscuro (Rendimiento)">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Modo Satélite (En Vivo)">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <MapController activeEvents={activeEvents} />

        {/* User Location or Default Cities */}
        {userLocation ? (
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup><strong>{userLocation.name}</strong><br/>Monitoreo Activo</Popup>
          </Marker>
        ) : (
          defaultCities.map((city, idx) => (
            <Marker key={idx} position={[city.lat, city.lng]}>
              <Popup><strong>{city.name}</strong><br/>Monitoreo Activo</Popup>
            </Marker>
          ))
        )}

        {/* Render all active events */}
        {activeEvents.map(event => (
          <React.Fragment key={event.id}>
            <Marker 
              position={[event.lat, event.lng]} 
              icon={getHazardIcon(event.type)}
            >
              <Popup>
                <strong>{event.location}</strong><br/>
                {event.value}
              </Popup>
            </Marker>
            
            {/* Specific overlays based on event type */}
            {(event.type === 'quake' || event.type === 'tsunami') && event.waveRadius && (
              <Circle 
                center={[event.lat, event.lng]}
                pathOptions={{ 
                  fillColor: 'transparent',
                  color: event.type === 'quake' ? '#ef4444' : '#0ea5e9',
                  weight: 2,
                  dashArray: event.type === 'quake' ? '10, 10' : '20, 5'
                }}
                radius={event.waveRadius * 1000} // km to meters
              />
            )}
            
            {event.type === 'volcano' && (
              <Circle 
                center={[event.lat, event.lng]}
                pathOptions={{ fillColor: '#8b5cf6', fillOpacity: 0.2, color: 'transparent' }}
                radius={12000} // 12km exclusion zone
              />
            )}
            
            {event.type === 'hurricane' && (
              <Circle 
                center={[event.lat, event.lng]}
                pathOptions={{ fillColor: '#06b6d4', fillOpacity: 0.1, color: '#06b6d4', weight: 1 }}
                radius={100000} // 100km storm eye/force winds
              />
            )}
          </React.Fragment>
        ))}

      </MapContainer>
    </div>
  );
}
