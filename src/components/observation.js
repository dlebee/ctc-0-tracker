function formatDate(date) {
    return new Date(date).toString();
}

const Observation = ({ observation }) => {

    // Map sat_id to satellite name
    const getSatelliteName = (satId) => {
        const id = satId?.toString();
        if (id === 'VWXG-4101-0824-5480-8078') return 'CTC-0';
        if (id === 'OTUO-9494-3471-7180-4596') return 'CTC-1A';
        if (id === 'CDDD-0280-4973-5946-866') return 'CTC-1B';
        if (id === 'IJQV-1195-2515-8742-0084') return 'CTC-1C';
        // Fallback: try NORAD ID if sat_id not available
        const noradId = observation.satellite_norad_cat_id?.toString();
        if (noradId === '62401') return 'CTC-0';
        if (noradId === '98482') return 'CTC-1A';
        if (noradId === '98481') return 'CTC-1B';
        if (noradId === '98480') return 'CTC-1C';
        return `Satellite ${satId || noradId || 'Unknown'}`;
    };

    return (
        <div className="observation-card">
            <h3 style={{ textAlign: 'center', marginBottom: '5px' }}>Latest Observation</h3>

            <div style={{ width: '175px', textAlign: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>Satellite</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc', fontWeight: 'bold' }}>
                    {getSatelliteName(observation.sat_id)}
                </p>
            </div>

            <div style={{ width: '175px', textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ whiteSpace: 'wrap', margin: '0', fontSize: '14px', color: '#ccc' }}>{formatDate(observation.start)}</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>Observer</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>{observation.observer}</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>Station</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>{observation.station_name}</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>Station Position</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>
                    {observation.station_lat}, {observation.station_lng}, {observation.station_alt}
                </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>Transmitter</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>{observation.transmitter_description}</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>Transmitter Mode</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>{observation.transmitter_mode}</p>
            </div>

            <div>
                <h4 style={{ margin: '0', fontSize: '16px' }}>Transmitter Baud</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>{observation.transmitter_baud}</p>
            </div>
        </div>


    );
};

export default Observation;