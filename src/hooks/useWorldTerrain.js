import * as Cesium from "cesium";
import { useState, useEffect } from 'react';

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