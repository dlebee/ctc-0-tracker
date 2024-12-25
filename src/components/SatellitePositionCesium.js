'use client';

import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import * as satellite from "satellite.js";

import "cesium/Build/Cesium/Widgets/widgets.css";


if (typeof window !== "undefined") {
    window.CESIUM_BASE_URL = process.env.CESIUM_BASE_URL || "/cesium";
}

const fetchOrCache = async function() {


  const url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";
  
  
  //const starlinkUrl = "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle";

  if (localStorage.getItem('__CACHED_POSITIONS__' + url)) {
    let result = localStorage.getItem('__CACHED_POSITIONS__' + url);
    return result;
  }

  const response = await fetch(url)
  if (response.status == 200) {
    const text = await response.text();
    localStorage.setItem('__CACHED_POSITIONS__' + url, text);
    return text;
  }

  throw new Error('Failed to fetch satelite positions by group');
}

const getSatelites = async function() {


  const text = await fetchOrCache();
  const lines = text.split('\r\n');
  let result = [];
  //let maxSat = 1;
  for(let i = 0 ; i+2 < lines.length; i+= 3) {
    let name = lines[i];
    let tle1 = lines[i+1];
    let tle2 = lines[i+2];
    result.push({
      name: name,
      tle1: tle1,
      tle2: tle2
    });
  }

  if (!result.find(t => t.name == 'CTC-0')) {
    result.push({
      name: "CTC-0",
      tle1: "1 98728U          24358.00000000  .00000000  00000-0  43254-2 0    09",
      tle2: "2 98728  45.0018 353.7498 0003705   4.7833 137.4401 15.19235095    03"
    });
  }

  console.log('how many sats', result.length);

  return result;  
}

const SatelliteCesium = () => {
  const viewerRef = useRef(null);
  const entitiesRef = useRef({}); // Track entities by satellite name
  let currentInterval = null;

  useEffect(() => {
    const initCesium = async () => {
      const sats = await getSatelites();


      const imagerySources = Cesium.createDefaultImageryProviderViewModels();
      const defaultBaseLayer = imagerySources.find(t => t.name == "Earth at night");
      
      // Initialize Cesium Viewer
      const viewer = new Cesium.Viewer("cesiumContainer", {
        terrainProvider: await Cesium.createWorldTerrainAsync(),
        imageryProviderViewModels: imagerySources,
        selectedImageryProviderViewModel: defaultBaseLayer
      });
      viewerRef.current = viewer;

      // Initialize Satellite Entities
      sats.forEach((satellite) => {
        if (!entitiesRef.current[satellite.name]) {
          // Add entity to the viewer
          const entity = viewer.entities.add({
            id: satellite.name,
            name: satellite.name,
            position: Cesium.Cartesian3.fromDegrees(0, 0, 0), // Temporary position
            point: satellite.name == 'CTC-0' ? undefined : {
              pixelSize: 2,
              color: Cesium.Color.WHITE
            },
            billboard: satellite.name == 'CTC-0' ? {
              image: 'ctc-0.png',
              width: 32,
              height: 32
            } : undefined
          });

          // Track entity reference
          entitiesRef.current[satellite.name] = entity;
        }
      });

        // Add orbit line for CTC-0
      const addOrbitLine = (sat) => {
        const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
        const gmst = satellite.gstime(new Date());
        const positions = [];

        for (let i = 0; i < 5700; i += 20) { // Propagate positions for an hour at 1-minute intervals
          const futureDate = new Date(new Date().getTime() + i * 1000);
          const positionAndVelocity = satellite.propagate(satrec, futureDate);
          if (positionAndVelocity.position) {
            const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
            const latitude = Cesium.Math.toDegrees(geodetic.latitude);
            const longitude = Cesium.Math.toDegrees(geodetic.longitude);
            const altitude = geodetic.height * 1000; // Convert from km to meters

            positions.push(longitude, latitude, altitude);
          }
        }

        // Add polyline to Cesium viewer
        viewer.entities.add({
          name: `${sat.name} Orbit`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
            width: 2,
            material: Cesium.Color.GREEN.withAlpha(0.7),
          },
        });
      };

      const ctcSatellite = sats.find((sat) => sat.name === "CTC-0");
      if (ctcSatellite) {
        addOrbitLine(ctcSatellite);
      }

      let firstTime = true;
      const updateSatellitesPosition = () => {
        // const now = new Date();

        // Get time from Cesium viewer's clock
        //const cesiumTime = viewer.clock.currentTime; // Cesium's JulianDate
        const jsDate = new Date(); // Convert to JavaScript Date

        sats.forEach((sat) => {
          const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
          const positionAndVelocity = satellite.propagate(satrec, jsDate);

          if (positionAndVelocity.position) {
            const gmst = satellite.gstime(jsDate);
            const geodetic = satellite.eciToGeodetic( 
              positionAndVelocity.position,
              gmst
            );

            const latitude = Cesium.Math.toDegrees(geodetic.latitude);
            const longitude = Cesium.Math.toDegrees(geodetic.longitude);
            const altitude = geodetic.height * 1000; // Convert from km to meters

            // Update position using SampledPositionProperty
            const entity = entitiesRef.current[sat.name];
            if (entity) {
              const newPosition = Cesium.Cartesian3.fromDegrees(
                longitude,
                latitude,
                altitude
              );
              entity.position = new Cesium.ConstantPositionProperty(newPosition); // Update smoothly

              if (firstTime && sat.name == 'CTC-0') {

                // flying to CTC-0, at first geo positioning.
                viewer.scene.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude + (20000 * 1000)) 
                });

                viewer.selectedEntity = entity;
              }
            }
          }
        });

        firstTime = false;
      };

      // Update positions periodically
      currentInterval = setInterval(updateSatellitesPosition, 500);
    };

    initCesium().catch(console.error);

    return () => {
      if (viewerRef.current) viewerRef.current.destroy();
      if (currentInterval) clearInterval(currentInterval);
    };
  }, []);

  return (
    <div
      id="cesiumContainer"
      style={{ width: "100%", height: "100vh", position: "relative" }}
    >
      <h1 style={{position: 'absolute', zIndex: 100000, left: '43%', top: 25}}>CTC-0 Tracker 🎄</h1>

    </div>
  );
};

export default SatelliteCesium;