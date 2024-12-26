import { fetchCtc0observationsFromSatNog } from '@/api/satnog';
import { useState, useEffect } from 'react';

const fetchOrCache = async function () {

    const cacheKey = '__CACHED_OBSERVATIONS__';
    const cacheExpKey = cacheKey + '_EXP';

    // Check if the cache exists and is valid
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheExpKey);

    if (cachedData && cachedTimestamp) {
        const now = Date.now();
        const expirationTime = parseInt(cachedTimestamp, 10);

        // If the cache is still valid, return the cached data
        if (now - expirationTime < 1 * 60 * 60 * 1000) { // 6 hours in milliseconds
            return JSON.parse(cachedData);
        }
    }

    // If no valid cache, fetch the content
    const result = await fetchCtc0observationsFromSatNog();
    localStorage.setItem(cacheKey, JSON.stringify(result));
    localStorage.setItem(cacheExpKey, Date.now().toString());
    return result;
};


const useCtcObservations = function () {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        let isMounted = true; // To avoid setting state if unmounted

        setLoading(true);
        fetchOrCache()
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

export default useCtcObservations;