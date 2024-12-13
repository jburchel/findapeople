// Utility functions for calculations and conversions
export function calculateDistance(lat1, lon1, lat2, lon2) {
    lat1 = parseFloat(lat1) * Math.PI / 180;
    lon1 = parseFloat(lon1) * Math.PI / 180;
    lat2 = parseFloat(lat2) * Math.PI / 180;
    lon2 = parseFloat(lon2) * Math.PI / 180;

    const R = 6371;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function convertToKilometers(distance, unit) {
    return unit === 'miles' ? distance * 1.60934 : distance;
}

export function convertFromKilometers(distance, unit) {
    return unit === 'miles' ? distance / 1.60934 : distance;
}

export function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index]?.trim() || '';
            return obj;
        }, {});
    });
}
