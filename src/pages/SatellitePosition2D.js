'use client';

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import * as satellite from "satellite.js";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Satellite SVG as a data URI
const satelliteIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32">
    <circle cx="32" cy="32" r="30" fill="#4caf50" />
    <path d="M32 16l8 8-8 8-8-8 8-8zm0 24l8 8-8 8-8-8 8-8z" fill="#ffffff"/>
  </svg>
`;

// Create a custom Leaflet icon
const satelliteIcon = new L.DivIcon({
  html: satelliteIconSvg,
  className: "custom-satellite-icon",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const SatellitePosition = () => {
  const [position, setPosition] = useState({ lat: 0, lng: 0, alt: 0 });

  const tleLine1 =
    "1 98728U          24358.00000000  .00000000  00000-0  43254-2 0    09";
  const tleLine2 =
    "2 98728  45.0018 353.7498 0003705   4.7833 137.4401 15.19235095    03";

  useEffect(() => {
    const calculatePosition = () => {
      const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
      const now = new Date();
      const positionAndVelocity = satellite.propagate(
        satrec,
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      );

      if (positionAndVelocity.position) {
        const gmst = satellite.gstime(now);
        const geodetic = satellite.eciToGeodetic(
          positionAndVelocity.position,
          gmst
        );

        const lat = satellite.degreesLat(geodetic.latitude);
        const lng = satellite.degreesLong(geodetic.longitude);
        const alt = geodetic.height * 1000; // Convert km to meters

        setPosition({ lat, lng, alt });
      }
    };

    calculatePosition();
    const interval = setInterval(calculatePosition, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Satellite Position</h1>
      <p>Latitude: {position.lat.toFixed(4)}°</p>
      <p>Longitude: {position.lng.toFixed(4)}°</p>
      <p>Altitude: {position.alt.toFixed(2)} meters</p>

      <MapContainer
        center={[position.lat, position.lng]}
        zoom={3}
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[position.lat, position.lng]} icon={satelliteIcon}>
          <Popup>
            <div>
              <p>Satellite</p>
              <p>
                Lat: {position.lat.toFixed(4)}°, Lng: {position.lng.toFixed(4)}°
              </p>
              <p>Alt: {position.alt.toFixed(2)} m</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default SatellitePosition;
