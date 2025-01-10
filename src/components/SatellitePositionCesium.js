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
    const defaultBaseLayer = imagerySources.find(t => t.name == "Earth at night");
    const viewer = new Cesium.Viewer(containerId, {
      terrainProvider: worldTerrain,
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

    if (satellite.name == 'CTC-0') {
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
      show: showOtherSats ? true : satellite.name == 'CTC-0'
    });

    if (satellite.name == 'CTC-0') {
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

  const existing = viewer.entities.getById('ctc-0-orbit');
  if (existing) {
    existing.polyline = {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
      width: 2,
      material: Cesium.Color.GREEN.withAlpha(0.7),
    };
  } else {
    // Add polyline to Cesium viewer
    viewer.entities.add({
      id: 'ctc-0-orbit',
      name: `${sat.name} Orbit`,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
        width: 2,
        material: Cesium.Color.GREEN.withAlpha(0.7),
      },
    });
  }
};

const updateSatellitesPosition = (viewer, sats, geoJson, setHoveredCountry, showOtherSats, firstTime = false) => {
  
  // Get time from Cesium viewer's clock
  const cesiumTime = viewer.clock.currentTime; // Cesium's JulianDate
  const dateOf = Cesium.JulianDate.toDate(cesiumTime);

  sats.forEach((sat) => {

    if (sat.name != 'CTC-0' && !showOtherSats) {
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


        if (sat.name == 'CTC-0') {
          // first time we fly to and track.
          if (firstTime) {
            // flying to CTC-0, at first geo positioning.
            viewer.scene.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude + (20000 * 1000)) 
            });

            //viewer.selectedEntity = entity;
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

const SatelliteCesium = () => {
  const [hoveredCountry, setHoveredCountry] = useState("Locating...");
  const { data: sats, loading: satsLoading, error: satsError } = useSatellites();
  const { data: observations, loading: observationsLoading, error: observationsError } = useCtcObservations();
  const { data: geo, loading: geoLoading, error: geoError } = useGeo();
  const [displayOtherSatellites, setDisplayOtherSatellites] = useState(false);

  const latestObservation = useMemo(() => {
    if (observations && observations.length)
      return observations[0];

    return null;
  }, [observations]);

  const { viewerRef, viewerReady } = useCesiumViewer("cesiumContainer", () => {
      setDisplayOtherSatellites(p => !p); 
  });

  const upodatedTLERef = useRef(false);

  useEffect(() => {
    if (!viewerRef.current || !sats || !geo) {
      return;
    }

    const viewer = viewerRef.current;
    addSatsToCesium(viewer, sats, geo, setHoveredCountry, displayOtherSatellites);

    const intervalId = setInterval(() => {
      updateSatellitesPosition(viewer, sats, geo, setHoveredCountry, displayOtherSatellites, false);
    }, 500);

    const orbitLineUpdateIntervalId = setInterval(() => {
      const ctc0 = sats.find(t => t.name == 'CTC-0');
      if (ctc0) {
        addOrUpdateOrbitLine(viewer, ctc0);
      }
    }, 20000);

    return () => {
      clearInterval(intervalId);
      clearInterval(orbitLineUpdateIntervalId);
      if (viewer.entities) {
        viewer.entities.removeAll();
      }
    };
  }, [viewerReady, sats, displayOtherSatellites]);

  useEffect(() => {
    if (observations && observations.length) {
      if (sats.length) {
        if (upodatedTLERef.current) {
          return;
        }

        const ctc0 = sats.find(t => t.name == 'CTC-0');
        if (ctc0) {
          // find a good observation..
          const goodObservation = observations.find(t => t.status == 'good');
          if (goodObservation) {
            if (ctc0.tle1 != goodObservation.tle1 && ctc0.tle2 != goodObservation.tle2) {
              ctc0.tle1 = goodObservation.tle1;
              ctc0.tle2 = goodObservation.tle2;
              console.log('updated TLE from latest good satnog observation');
            } else {
              console.log('got the same TLE from latest good satnog observation');
            }
          } else {
            console.warn('no good status observation in result.')
          }
        }

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
      <h1 style={{ textAlign: 'center', fontWeight: 'bold' }}><img height="32" src="ctc-0.png"/> CTC-0 Tracker</h1>
      <p style={{ textAlign: 'center' }}>Currently over: <strong>{hoveredCountry}</strong></p>
      {/* <p style={{ textAlign: 'center'}}>Happy new year!</p> */}
    </>;

  return (
    <>
      <div
        id="cesiumContainer"
        style={{ width: "100%", height: "100vh", position: "relative" }}
      >
        
        
      </div>

      <div style={{ top: 25, position: 'absolute', zIndex: 1, left: 0, right: 0, color: 'green', userSelect: 'none' }}>
      {topAbsoluteContent}
      </div>

      <div style={{ bottom: 60, right: 25, zIndex: 1, position: 'absolute' }}>
      {latestObservation ? <Observation observation={latestObservation}></Observation> : null}
      </div>
    </>
  );
};

export default SatelliteCesium;