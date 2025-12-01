import { useState, useEffect } from 'react';

const fetchOrCache = async function (url) {
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

const parseData = (text) => {

    const lines = text.split('\r\n');

    let result = [];
    //let maxSat = 1;
    for (let i = 0; i + 2 < lines.length; i += 3) {
        let name = lines[i].trimRight();
        let tle1 = lines[i + 1];
        let tle2 = lines[i + 2];

        const noradID = tle2.split(' ')[1];

        result.push({
            id: noradID,
            name: name,
            tle1: tle1,
            tle2: tle2
        });
    }

    // Add hardcoded CTC-0 satellite
    if (!result.find(t => t.name == 'CTC-0')) {
        result.push({
            id: "62401",
            name: "CTC-0",
            tle1: "1 62401U 24247AA  25335.19596333  .00021745  00000-0  71069-3 0  9994",
            tle2: "2 62401  44.9757 284.8746 0003647 152.3285 207.7794 15.31418293 52781"
        });
    }
    // Add hardcoded CTC-1 satellites
    if (!result.find(t => t.name == 'CTC-1A')) {
        result.push({
            id: "98482",
            name: "CTC-1A",
            tle1: "1 98482U          25332.82035646  .00002260  00000-0  26965-3 0 00004",
            tle2: "2 98482 100.9533 041.2290 0220836 348.9723 000.7695 14.68335039000053"
        });
    }
    if (!result.find(t => t.name == 'CTC-1B')) {
        result.push({
            id: "98481",
            name: "CTC-1B",
            tle1: "1 98481U          25332.82173840  .00002073  00000-0  24504-3 0 00001",
            tle2: "2 98481 101.0636 041.2165 0216164 356.5493 000.8209 14.69301244000051"
        });
    }
    if (!result.find(t => t.name == 'CTC-1C')) {
        result.push({
            id: "98480",
            name: "CTC-1C",
            tle1: "1 98480U          25332.82216433  .00002024  00000-0  23984-3 0 00003",
            tle2: "2 98480 101.0768 041.2168 0216849 358.5891 001.1201 14.69120612000057"
        });
    }

    // if (!result.find((t) => t.name === 'Santa Claus 🎅')) {
    //     result.push({
    //         id: "00000",
    //         name: "Santa Claus 🎅",
    //         tle1: "1 00000U 98067A   24359.68458358  .00023188  00000+0  41052-3 0  9996",
    //         tle2: "2 00000  51.6394  91.5363 0005189   2.3927 145.3896 15.90168044488092"
    //     });
    // }

    // easter-egg :D 
    /*
        1 43205U 18017A   18038.22157858  .00505133 -52681-6  23951-2 0  9997
        2 43205  29.0196 286.7252 3400758 181.1849 342.1043  8.76376464    24
    */
    // result.push({
    //     id: "43205",
    //     name: "TESLA ROADSTER/FALCON 9H",
    //     // tle1: "1 43205U 18017A   18038.22157858  .00505133 -52681-6  23951-2 0  9997",
    //     // tle2: "2 43205  29.0196 286.7252 3400758 181.1849 342.1043  8.76376464    24"
    //     tle1: "1 43205U 18017A   18038.22157858  .00505133 -52681-6  23951-2 0  9997",
    //     tle2: "2 43205  29.0196 286.7252 3400758 181.1849 342.1043  8.76376464    24"
    // });

    return result;
}

const useSatellites = function (url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle") {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        let isMounted = true; // To avoid setting state if unmounted

        setLoading(true);
        fetchOrCache(url)
            .then((data) => {
                if (isMounted) {
                    const parsed = parseData(data);
                    setData(parsed);
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
    }, [url]);

    return { data, loading, error };
}

export default useSatellites;