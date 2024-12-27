function formatDate(date) {
    return new Date(date).toString();
}

const Observation = ({ observation }) => {

    return (
        <div className="observation-card">
            <h3 style={{ textAlign: 'center', marginBottom: '5px' }}>Latest Observation</h3>

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