import { useState, useEffect } from 'react';

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

const useGeo = function () {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        let isMounted = true; // To avoid setting state if unmounted

        setLoading(true);
        fetchOrCacheGeoJson()
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

export default useGeo;