import "@/styles/globals.css";

import dynamic from 'next/dynamic';

const SatellitePosition2D = dynamic(() => import('./SatellitePosition2D'), { ssr: false });
const SatellitePositionCesium = dynamic(() => import('./SatellitePositionCesium'), { ssr: false });

export default function App({ Component, pageProps }) {
  return <>
    {/* <SatellitePosition2D></SatellitePosition2D> */}
    <SatellitePositionCesium></SatellitePositionCesium>
  </>
}
