import { fetchCtc0observationsFromSatNog } from '@/api/satnog';
import { useState, useEffect } from 'react';


const useCtcObservations = function () {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);



    useEffect(() => {

        let isMounted = true; // To avoid setting state if unmounted

        const refreshObservations = function () {
            setLoading(true);
            fetchCtc0observationsFromSatNog()
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
        }

        refreshObservations();

        const interval = setInterval(() => {
            refreshObservations();
        }, 60000); // every 1 min


        return () => {
            isMounted = false;
            window.clearInterval(interval);
         } // Cleanup on unmount
    }, []);

    return { data, loading, error };
}

export default useCtcObservations;