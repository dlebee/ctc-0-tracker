import useSatellites from "@/hooks/useSatellites";
import useGeo from "@/hooks/useGeo";
import * as satellite from "satellite.js";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

const NextFlyBy = () => {
  const { data: geoJson, loading: geoLoading, error: geoError } = useGeo();
  const { data: sats, loading: satsLoading, error: satsError } = useSatellites();

  if (geoLoading || satsLoading) return <div>Loading...</div>;
  if (geoError || satsError) return <div>Error loading data</div>;

  const sat = sats.find(t => t.name === "CTC-0");
  if (!sat) return <div>CTC-0 not found...</div>;

  const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
  const intervalMinutes = 5;
  const now = new Date();
  const end = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const positions = [];

  for (let d = new Date(now); d <= end; d.setMinutes(d.getMinutes() + intervalMinutes)) {
    const positionAndVelocity = satellite.propagate(satrec, d);
    const positionEci = positionAndVelocity.position;
    if (!positionEci) continue;

    const gmst = satellite.gstime(d);
    const geodetic = satellite.eciToGeodetic(positionEci, gmst);
    const latitude = Cesium.Math.toDegrees(geodetic.latitude);
    const longitude = Cesium.Math.toDegrees(geodetic.longitude);

    const point = turf.point([longitude, latitude]);

    for (const feature of geoJson.features) {
      const isInCountry = turf.booleanPointInPolygon(point, feature);
      if (isInCountry) {
        positions.push({
          time: new Date(d), // clone to avoid mutation
          latitude,
          longitude,
          country: feature.properties.admin || feature.properties.name,
        });
        break;
      }
    }
  }

  return (
    <div>
      <h2>Next Flybys for {sat.name}</h2>
      <ul>
        {positions.map((pos, idx) => (
          <li key={idx}>
            {pos.time.toLocaleString()} — {pos.country} ({pos.latitude.toFixed(2)}, {pos.longitude.toFixed(2)})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NextFlyBy;
