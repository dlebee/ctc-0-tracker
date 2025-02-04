import * as Cesium from "cesium";
import { useState, useEffect } from 'react';

Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZDZlZDBjZi0xMjg1LTRiOWEtOTYyMS1jZmVmNzA5MDY3MGYiLCJpZCI6MjczMTg0LCJpYXQiOjE3Mzg2MjcwNjZ9.OsYdZsjcDjqAP6s9xQ75961Pv5a5F4hSbEmG1S1ZIJY";

const useWorldTerrain = function () {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        let isMounted = true; // To avoid setting state if unmounted
        setLoading(true);
        Cesium.createWorldTerrainAsync()
            .then((data) => {
                if (isMounted) {
                    setData(data);
                    setLoading(false);
                }
            })
            .catch(error => {
                if (isMounted) {
                    setError(error);
                    setLoading(false);
                }
            });

        return () => (isMounted = false); // Cleanup on unmount
    }, []);

    return { data, loading, error };
}

export default useWorldTerrain;