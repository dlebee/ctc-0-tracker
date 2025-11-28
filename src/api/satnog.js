
const fetchCtcObservationsFromSatNog = async () => {
    // const apiBaseUrl = `https://network.satnogs.org`;
    // const fullUrl = `${apiBaseUrl}/api/observations/?id=&status=good&satellite__norad_cat_id=98728`;
    const result = await fetch('/api/observations');
    if (result.status == 200) {
        return await result.json();
    } 

    throw new Error('failed to fetch ctc-1 observations from satnog');
}

export { fetchCtcObservationsFromSatNog };