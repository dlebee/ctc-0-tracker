'use client';

import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import * as turf from "@turf/turf";

import "cesium/Build/Cesium/Widgets/widgets.css";


if (typeof window !== "undefined") {
    window.CESIUM_BASE_URL = process.env.CESIUM_BASE_URL || "/cesium";
}

const fetchOrCache = async function() {
  const url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

  const cacheKey = '__CACHED_POSITIONS__' + url;
  const cacheExpKey = cacheKey + '_EXP';

  // Check if the cache exists and is valid
  const cachedData = localStorage.getItem(cacheKey);
  const cachedTimestamp = localStorage.getItem(cacheExpKey);

  if (cachedData && cachedTimestamp) {
    const now = Date.now();
    const expirationTime = parseInt(cachedTimestamp, 10);

    // If the cache is still valid, return the cached data
    if (now - expirationTime < 6 * 60 * 60 * 1000) { // 6 hours in milliseconds
      return cachedData;
    }
  }

  // If no valid cache, fetch the content
  const response = await fetch(url);

  if (response.status === 200) {
    const text = await response.text();

    // Update cache and expiration timestamp
    localStorage.setItem(cacheKey, text);
    localStorage.setItem(cacheExpKey, Date.now().toString());

    return text;
  }

  throw new Error('Failed to fetch satellite positions by group');
};


const fetchOrCacheGeoJson = async () => {
  const url = "https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson";

  if (localStorage.getItem("__CACHED_GEOJSON__")) {
    return JSON.parse(localStorage.getItem("__CACHED_GEOJSON__"));
  }

  const response = await fetch(url);
  if (response.status === 200) {
    const geoJson = await response.json();
    localStorage.setItem("__CACHED_GEOJSON__", JSON.stringify(geoJson));
    return geoJson;
  }

  throw new Error("Failed to fetch GeoJSON.");
};

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

  if (!result.find((t) => t.name === 'Santa Claus 🎅')) {
    result.push({
      name: "Santa Claus 🎅",
      tle1: "1 25544U 98067A   24359.68458358  .00023188  00000+0  41052-3 0  9996",
      tle2: "2 25544  51.6394  91.5363 0005189   2.3927 145.3896 15.90168044488092"
    });
  }

  // easter-egg :D 
  result.push({
    name: "space-roadster",
    tle1: "1 59228U 24048A   24338.88712994 -.00004807  00000+0  00000+0 0  9990",
    tle2: "2 59228  29.5806 355.5889 3256158 188.2034 162.4923  1.03009986    15"
  });

  console.log('how many sats', result.length);

  return result;  
}

const SatelliteCesium = () => {
  const viewerRef = useRef(null);
  const [hoveredCountry, setHoveredCountry] = useState("Locating...");
  const entitiesRef = useRef({}); // Track entities by satellite name
  const intervalSetRef = useRef(false);
  let currentInterval = null;
  let lastTime = null;

  useEffect(() => {
    const initCesium = async () => {
      const sats = await getSatelites();
      const geoJson = await fetchOrCacheGeoJson()


      const imagerySources = Cesium.createDefaultImageryProviderViewModels();
      const defaultBaseLayer = imagerySources.find(t => t.name == "Earth at night");
      
      // Initialize Cesium Viewer
      const viewer = new Cesium.Viewer("cesiumContainer", {
        terrainProvider: await Cesium.createWorldTerrainAsync(),
        imageryProviderViewModels: imagerySources,
        selectedImageryProviderViewModel: defaultBaseLayer,
        clockViewModel: new Cesium.ClockViewModel(
          new Cesium.Clock({
            shouldAnimate: true, // Ensure the clock starts unpaused
          })
        ),
      });

      viewer.scene.moon = new Cesium.Moon({
        show: true,
        onlySunLighting: false
      });
      viewerRef.current = viewer;

      // Initialize Satellite Entities
      sats.forEach((satellite) => {
        if (!entitiesRef.current[satellite.name]) {
          // Add entity to the viewer

          let billboard = undefined;
          let point = undefined;

          if (satellite.name == 'CTC-0') {
            billboard = {
              image: 'ctc-0.png',
              width: 48,
              height: 48
            };
          } else if (satellite.name.startsWith('ISS (ZARYA)')) {
            billboard = {
              image: 'iss.png',
              width: 64,
              height: 64
            };
          } else if (satellite.name == 'Santa Claus 🎅') {
            billboard = {
              image: 'santa.png',
              width: 128,
              height: 64
            };
          } else if (satellite.name == 'space-roadster') {
            billboard = {
              image: 'roadster.png',
              width: 64,
              height: 64
              
            };
          }else {
            // point = {
            //   pixelSize: 2,
            //   color: Cesium.Color.WHITE
            // };
            billboard = {
              image: 'satellite.png',
              width: 12,
              height: 12
            };
          }

          const entity = viewer.entities.add({
            id: satellite.name,
            name: satellite.name,
            position: Cesium.Cartesian3.fromDegrees(0, 0, 0), // Temporary position
            point: point,
            billboard: billboard
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
        const cesiumTime = viewer.clock.currentTime; // Cesium's JulianDate
        const dateOf = Cesium.JulianDate.toDate(cesiumTime);

        //const jsDate = new Date(); // Convert to JavaScript Date

        sats.forEach((sat) => {
          const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
          const positionAndVelocity = satellite.propagate(satrec, dateOf);
          //const positionAndVelocity = satellite.propagate(satrec, jsDate);

          if (positionAndVelocity.position) {
            //const gmst = satellite.gstime(jsDate);
            
            const gmst = satellite.gstime(dateOf);
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

              if (sat.name == 'CTC-0') {
                // first time we fly to and track.
                if (firstTime) {
                  // flying to CTC-0, at first geo positioning.
                  viewer.scene.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude + (20000 * 1000)) 
                  });

                  viewer.selectedEntity = entity;
                }

                // Check which country the satellite is over
                if (geoJson) {
                  setHoveredCountry('International Waters');
                  const point = turf.point([longitude, latitude]);
                  for (const feature of geoJson.features) {
                    const match = turf.booleanPointInPolygon(point, feature);
                    if (match) {
                      setHoveredCountry(feature.properties.admin || "Unknown");
                      break;
                    }
                  }
                }
              }
            }
          }
        });

        firstTime = false;
      };

      // Update positions periodically
      if (!intervalSetRef.current) {
        currentInterval = setInterval(updateSatellitesPosition, 500);
        intervalSetRef.current = true;
      }
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
      <div style={{top: 25, position: 'absolute', zIndex: 1000000, left: 0, right: 0, color: 'green'}}>
        <h1 style={{textAlign: 'center', fontWeight: 'bold'}}>🎅 CTC-0 Tracker 🎄</h1>
        <p style={{textAlign: 'center', fontWeight: 'bold'}}>currently over: {hoveredCountry}</p>
      </div>
 

    </div>
  );
};

export default SatelliteCesium;