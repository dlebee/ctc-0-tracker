'use client';

import React, { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import * as satellite from "satellite.js";

import "cesium/Build/Cesium/Widgets/widgets.css";


if (typeof window !== "undefined") {
    window.CESIUM_BASE_URL = process.env.CESIUM_BASE_URL || "/cesium";
}

const SatelliteCesium = () => {
  const viewerRef = useRef(null);

  const tleLine1 =
    "1 98728U          24358.00000000  .00000000  00000-0  43254-2 0    09";
  const tleLine2 =
    "2 98728  45.0018 353.7498 0003705   4.7833 137.4401 15.19235095    03";

  useEffect(() => {
    const initCesium = async () => {
      // Cesium Viewer Initialization
      const viewer = new Cesium.Viewer("cesiumContainer", {
        terrainProvider: await Cesium.createWorldTerrainAsync(),
      });
      viewerRef.current = viewer;

      // Add a point for the satellite
      const satelliteEntity = viewer.entities.add({
        name: "Satellite",
        position: Cesium.Cartesian3.fromDegrees(0, 0, 0), // Temporary position
        // point: {
        //   pixelSize: 10,
        //   color: Cesium.Color.GREEN,
        // },
        billboard: {
            image: "roadmap-2024-qeffNjuE.png", // Replace with the actual path to your PNG
            width: 32, // Set the width of the PNG
            height: 32, // Set the height of the PNG
          },
      });

      const updateSatellitePosition = () => {
        const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
        const now = new Date();
        const positionAndVelocity = satellite.propagate(satrec, now);

        if (positionAndVelocity.position) {
          const gmst = satellite.gstime(now);
          const geodetic = satellite.eciToGeodetic(
            positionAndVelocity.position,
            gmst
          );

          const latitude = Cesium.Math.toDegrees(geodetic.latitude);
          const longitude = Cesium.Math.toDegrees(geodetic.longitude);
          const altitude = geodetic.height * 1000; // Convert from km to meters

          // Update satellite position
          satelliteEntity.position = Cesium.Cartesian3.fromDegrees(
            longitude,
            latitude,
            altitude
          );
        }
      };

      // Update the satellite's position every second
      setInterval(updateSatellitePosition, 500);
    };

    initCesium().catch(console.error);

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      id="cesiumContainer"
      style={{ width: "100%", height: "100vh", position: "relative" }}
    ></div>
  );
};

export default SatelliteCesium;
