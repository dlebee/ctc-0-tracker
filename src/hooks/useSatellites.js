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
            tle1: "1 62401U 24247AA  25332.19525845  .00018724  00000-0  61599-3 0  9991",
            tle2: "2 62401  44.9749 301.3576 0003214 127.8691 232.2484 15.31294714 52325"
        });
    }
    // Add hardcoded CTC-1 satellites
    if (!result.find(t => t.name == 'CTC-1A')) {
        result.push({
            id: "98482",
            name: "CTC-1A",
            tle1: "1 98482C 14900A   25332.82053736  .00000000  00000-0 -10524-2 0    02",
            tle2: "2 98482  97.4397  44.8315 0001357  66.6449 284.0474 15.17687649    01"
        });
    }
    if (!result.find(t => t.name == 'CTC-1B')) {
        result.push({
            id: "98481",
            name: "CTC-1B",
            tle1: "1 98481C 14900A   25332.82191931  .00000000  00000-0 -11039-2 0    03",
            tle2: "2 98481  97.4393  44.8328 0001427  65.2127 293.0257 15.17672644    04"
        });
    }
    if (!result.find(t => t.name == 'CTC-1C')) {
        result.push({
            id: "98480",
            name: "CTC-1C",
            tle1: "1 98480C 14900A   25332.82234523  .00000000  00000-0 -11173-2 0    06",
            tle2: "2 98480  97.4394  44.8331 0001367  68.9151 291.6487 15.17695680    02"
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