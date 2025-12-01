'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import * as turf from "@turf/turf";

import "cesium/Build/Cesium/Widgets/widgets.css";
import useSatellites from "@/hooks/useSatellites";
import useGeo from "@/hooks/useGeo";
import useWorldTerrain from "@/hooks/useWorldTerrain";
import useCtcObservations from "@/hooks/useCtcObservations";
import Observation from "./observation";


if (typeof window !== "undefined") {
  window.CESIUM_BASE_URL = process.env.CESIUM_BASE_URL || "/cesium";
}

const useCesiumViewer = (containerId, toggleSatDisplayCallback) => {

  const viewerRef = useRef(null);
  const { data: worldTerrain, loading, error } = useWorldTerrain();
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {

    if (!worldTerrain || loading || error)
      return;

    if (viewerRef.current) 
      return;
  
    const imagerySources = Cesium.createDefaultImageryProviderViewModels();
    //const defaultBaseLayer = imagerySources.find(t => t.name == "Earth at night");
    const viewer = new Cesium.Viewer(containerId, {
      terrainProvider: worldTerrain,
      imageryProviderViewModels: imagerySources,
      //selectedImageryProviderViewModel: defaultBaseLayer,
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

    const toolbar = viewer.container.querySelector('.cesium-viewer-toolbar');

    // Create a new button
    const customButton = document.createElement('button');
    customButton.textContent = '🛰';
    customButton.className = 'cesium-button cesium-toolbar-button cesium-toggle-sats';

    // Add a click event listener to the button
    customButton.addEventListener('click', () => {
      toggleSatDisplayCallback();
    });

    // Append the button to the toolbar
    if (toolbar) {
        toolbar.appendChild(customButton);
    }

    viewerRef.current = viewer;
    setViewerReady(true);
    console.log('terrain created... and assigned viewerRef');

    return () => {
      if (viewerRef.current) {
        console.log('unmounting..., destroying cesium viewer ref');
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };

  }, [containerId, worldTerrain, loading, error]);

  return { viewerRef, viewerReady };
};

const addSatsToCesium = (viewer, sats, geo, setHoveredCountry, showOtherSats) => {
  sats.forEach((satellite) => {
    // Add entity to the viewer
    let billboard = undefined;
    let point = undefined;

    if (satellite.name == 'CTC-0' || satellite.name == 'CTC-1A' || satellite.name == 'CTC-1B' || satellite.name == 'CTC-1C') {
      billboard = {
        image: 'ctc-0.png',
        width: 48,
        height: 48
      };
    } else if (satellite.id == '25544') {
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
    } else if (satellite.id == '43205') {
      billboard = {
        image: 'roadster.png',
        width: 64,
        height: 64
      };
    } else {
      // point = {
      //   pixelSize: 2,
      //   color: Cesium.Color.WHITE
      // };
      billboard = {
        image: 'satellite.png',
        width: 8,
        height: 8
      };
    }

    viewer.entities.add({
      id: satellite.id,
      name: satellite.name,
      position: Cesium.Cartesian3.fromDegrees(0, 0, 0), // Temporary position
      point: point,
      billboard: billboard,
      show: showOtherSats ? true : (satellite.name == 'CTC-0' || satellite.name == 'CTC-1A' || satellite.name == 'CTC-1B' || satellite.name == 'CTC-1C')
    });

    if (satellite.name == 'CTC-0' || satellite.name == 'CTC-1A' || satellite.name == 'CTC-1B' || satellite.name == 'CTC-1C') {
      addOrUpdateOrbitLine(viewer, satellite);
    }
  });
  
  updateSatellitesPosition(viewer, sats, geo, setHoveredCountry, showOtherSats, true);
};

const mapNow = (viewer) => {
  const cesiumTime = viewer.clock.currentTime; // Cesium's JulianDate
  const dateOf = Cesium.JulianDate.toDate(cesiumTime);
  return dateOf;
}

const addOrUpdateOrbitLine = (viewer, sat) => {

  const now = mapNow(viewer);
  const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
  const gmst = satellite.gstime(now);
  const positions = [];

  for (let i = 0; i < 5700; i += 20) { // Propagate positions for an hour at 1-minute intervals
    const futureDate = new Date(now.getTime() + i * 1000);
    const positionAndVelocity = satellite.propagate(satrec, futureDate);
    if (positionAndVelocity.position) {
      const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
      const latitude = Cesium.Math.toDegrees(geodetic.latitude);
      const longitude = Cesium.Math.toDegrees(geodetic.longitude);
      const altitude = geodetic.height * 1000; // Convert from km to meters

      positions.push(longitude, latitude, altitude);
    }
  }

  // Determine color based on satellite name
  let color;
  if (sat.name == 'CTC-0') {
    color = Cesium.Color.GREEN.withAlpha(0.7);
  } else if (sat.name == 'CTC-1A') {
    color = Cesium.Color.CYAN.withAlpha(0.7);
  } else if (sat.name == 'CTC-1B') {
    color = Cesium.Color.YELLOW.withAlpha(0.7);
  } else if (sat.name == 'CTC-1C') {
    color = Cesium.Color.MAGENTA.withAlpha(0.7);
  } else {
    color = Cesium.Color.WHITE.withAlpha(0.7);
  }

  const orbitId = `ctc-orbit-${sat.id}`;
  const existing = viewer.entities.getById(orbitId);
  if (existing) {
    existing.polyline = {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
      width: 2,
      material: color,
    };
  } else {
    // Add polyline to Cesium viewer
    viewer.entities.add({
      id: orbitId,
      name: `${sat.name} Orbit`,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
        width: 2,
        material: color,
      },
    });
  }
};

const updateSatellitesPosition = (viewer, sats, geoJson, setHoveredCountry, showOtherSats, firstTime = false) => {
  
  // Get time from Cesium viewer's clock
  const cesiumTime = viewer.clock.currentTime; // Cesium's JulianDate
  const dateOf = Cesium.JulianDate.toDate(cesiumTime);

  sats.forEach((sat) => {

    const isCtcSat = sat.name == 'CTC-0' || sat.name == 'CTC-1A' || sat.name == 'CTC-1B' || sat.name == 'CTC-1C';
    if (!isCtcSat && !showOtherSats) {
      const entity = viewer.entities.getById(sat.id);
      if (entity) {
        entity.show = false;
      }

      return;
    }

    const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
    const positionAndVelocity = satellite.propagate(satrec, dateOf);

  
    if (positionAndVelocity.position) {
      const gmst = satellite.gstime(dateOf);
      const geodetic = satellite.eciToGeodetic( 
        positionAndVelocity.position,
        gmst
      );

      const latitude = Cesium.Math.toDegrees(geodetic.latitude);
      const longitude = Cesium.Math.toDegrees(geodetic.longitude);
      const altitude = geodetic.height * 1000; // Convert from km to meters

      // Update position using SampledPositionProperty
      const entity = viewer.entities.getById(sat.id);
      if (entity) {
        const newPosition = Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          altitude
        );

        if (entity.show == false) {
          entity.show = true;
        }

        entity.position = new Cesium.ConstantPositionProperty(newPosition); // Update smoothly


        if (isCtcSat) {
          // first time we fly to and track CTC-0 or CTC-1A
          if (firstTime && (sat.name == 'CTC-0' || sat.name == 'CTC-1A')) {
            // flying to satellite, at first geo positioning.
            viewer.scene.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude + (20000 * 1000)) 
            });

            //viewer.selectedEntity = entity;
          }

          // Check which country the satellite is over (use CTC-0 or CTC-1A for display)
          if (geoJson && (sat.name == 'CTC-0' || sat.name == 'CTC-1A')) {
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

const SatelliteCesium = () => {
  const [hoveredCountry, setHoveredCountry] = useState("Locating...");
  const { data: sats, loading: satsLoading, error: satsError } = useSatellites();
  const { data: observations, loading: observationsLoading, error: observationsError } = useCtcObservations();
  const { data: geo, loading: geoLoading, error: geoError } = useGeo();
  const [displayOtherSatellites, setDisplayOtherSatellites] = useState(false);
  const [hoveredSatellite, setHoveredSatellite] = useState(null);
  const [ctc1SatellitesInfo, setCtc1SatellitesInfo] = useState(null);
  const hoveredSatelliteRef = useRef(null);

  const latestObservation = useMemo(() => {
    if (observations && observations.length)
      return observations[0];

    return null;
  }, [observations]);

  const { viewerRef, viewerReady } = useCesiumViewer("cesiumContainer", () => {
      setDisplayOtherSatellites(p => !p); 
  });

  const upodatedTLERef = useRef(false);

  // Calculate positions for all CTC-1 satellites
  const calculateCtc1Positions = (viewer, sats, geoJson) => {
    if (!viewer || !sats) return null;

    const cesiumTime = viewer.clock.currentTime;
    const dateOf = Cesium.JulianDate.toDate(cesiumTime);
    const ctc1Sats = ['CTC-1A', 'CTC-1B', 'CTC-1C'];
    const info = [];

    ctc1Sats.forEach((satName) => {
      const sat = sats.find(s => s.name === satName);
      if (!sat) return;

      const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
      const positionAndVelocity = satellite.propagate(satrec, dateOf);

      if (positionAndVelocity.position) {
        const gmst = satellite.gstime(dateOf);
        const geodetic = satellite.eciToGeodetic(
          positionAndVelocity.position,
          gmst
        );

        const latitude = Cesium.Math.toDegrees(geodetic.latitude);
        const longitude = Cesium.Math.toDegrees(geodetic.longitude);
        const altitude = geodetic.height * 1000;

        let country = 'International Waters';
        if (geoJson) {
          const point = turf.point([longitude, latitude]);
          for (const feature of geoJson.features) {
            const match = turf.booleanPointInPolygon(point, feature);
            if (match) {
              country = feature.properties.admin || "Unknown";
              break;
            }
          }
        }

        info.push({
          name: satName,
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4),
          altitude: (altitude / 1000).toFixed(2),
          country: country
        });
      }
    });

    return info.length > 0 ? info : null;
  };

  useEffect(() => {
    if (!viewerRef.current || !sats || !geo) {
      return;
    }

    const viewer = viewerRef.current;
    addSatsToCesium(viewer, sats, geo, setHoveredCountry, displayOtherSatellites);

    // Calculate initial CTC-1 positions
    const initialInfo = calculateCtc1Positions(viewer, sats, geo);
    if (initialInfo) {
      setCtc1SatellitesInfo(initialInfo);
    }

    const intervalId = setInterval(() => {
      updateSatellitesPosition(viewer, sats, geo, setHoveredCountry, displayOtherSatellites, false);
      
      // Always update CTC-1 info
      const info = calculateCtc1Positions(viewer, sats, geo);
      if (info) {
        setCtc1SatellitesInfo(info);
      }
    }, 500);

    const orbitLineUpdateIntervalId = setInterval(() => {
      const ctc0 = sats.find(t => t.name == 'CTC-0');
      const ctc1A = sats.find(t => t.name == 'CTC-1A');
      const ctc1B = sats.find(t => t.name == 'CTC-1B');
      const ctc1C = sats.find(t => t.name == 'CTC-1C');
      if (ctc0) {
        addOrUpdateOrbitLine(viewer, ctc0);
      }
      if (ctc1A) {
        addOrUpdateOrbitLine(viewer, ctc1A);
      }
      if (ctc1B) {
        addOrUpdateOrbitLine(viewer, ctc1B);
      }
      if (ctc1C) {
        addOrUpdateOrbitLine(viewer, ctc1C);
      }
    }, 20000);

    return () => {
      clearInterval(intervalId);
      clearInterval(orbitLineUpdateIntervalId);
      if (viewer.entities) {
        viewer.entities.removeAll();
      }
    };
  }, [viewerReady, sats, displayOtherSatellites, geo]);

  useEffect(() => {
    if (observations && observations.length) {
      if (sats.length) {
        if (upodatedTLERef.current) {
          return;
        }

        // Update TLEs for all CTC satellites from observations
        const ctc0 = sats.find(t => t.name == 'CTC-0');
        const ctc1A = sats.find(t => t.name == 'CTC-1A');
        const ctc1B = sats.find(t => t.name == 'CTC-1B');
        const ctc1C = sats.find(t => t.name == 'CTC-1C');
        
        // Find observations for each satellite by sat_id
        const updateSatelliteTLE = (sat, satId) => {
          if (sat) {
            const goodObservation = observations.find(t => t.status == 'good' && t.sat_id == satId);
            if (goodObservation) {
              if (sat.tle1 != goodObservation.tle1 && sat.tle2 != goodObservation.tle2) {
                sat.tle1 = goodObservation.tle1;
                sat.tle2 = goodObservation.tle2;
                console.log(`updated TLE for ${sat.name} from latest good satnog observation`);
              }
            }
          }
        };

        updateSatelliteTLE(ctc0, 'VWXG-4101-0824-5480-8078');
        updateSatelliteTLE(ctc1A, 'OTUO-9494-3471-7180-4596');
        updateSatelliteTLE(ctc1B, 'CDDD-0280-4973-5946-866');
        updateSatelliteTLE(ctc1C, 'IJQV-1195-2515-8742-0084');

        upodatedTLERef.current = true;
      }
    }

    return () => {
      upodatedTLERef.current = false;
    }
  }, [sats, observations]);

  const topAbsoluteContent = satsLoading && geoLoading ?
    <>
      <h1>Loading data...</h1>
    </>
    :
    <>
      <h1 style={{ textAlign: 'center', fontWeight: 'bold' }}><img height="32" src="ctc-0.png"/> CTC Tracker</h1>
      {ctc1SatellitesInfo && ctc1SatellitesInfo.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <p style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '16px' }}>CTC-1 Satellites:</p>
          {ctc1SatellitesInfo.map((satInfo, index) => (
            <div key={index} style={{ 
              marginBottom: '6px', 
              padding: '4px 8px',
              backgroundColor: satInfo.name === 'CTC-1A' ? 'rgba(0, 255, 255, 0.2)' : 
                              satInfo.name === 'CTC-1B' ? 'rgba(255, 255, 0, 0.2)' : 
                              'rgba(255, 0, 255, 0.2)',
              borderRadius: '4px',
              display: 'inline-block',
              marginRight: '8px'
            }}>
              <strong>{satInfo.name}</strong>: {satInfo.latitude}°, {satInfo.longitude}° | 
              Alt: {satInfo.altitude} km | Over: <strong>{satInfo.country}</strong>
            </div>
          ))}
        </div>
      )}
      {/* <p style={{ textAlign: 'center'}}>Happy new year!</p> */}
    </>;

  return (
    <>
      <div
        id="cesiumContainer"
        style={{ width: "100%", height: "100vh", position: "relative" }}
      >
        
        
      </div>

      <div style={{ top: 25, position: 'absolute', zIndex: 1000, left: 0, right: 0, color: 'green', userSelect: 'none' }}>
      {topAbsoluteContent}
      </div>

      <div style={{ bottom: 60, right: 25, zIndex: 1, position: 'absolute' }}>
      {latestObservation ? <Observation observation={latestObservation}></Observation> : null}
      </div>
    </>
  );
};

export default SatelliteCesium;