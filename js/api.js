// API related functions
const JP_API_KEY = '080e14ad747e';
const JP_API_BASE_URL = 'https://joshuaproject.net/api/v2';

export async function searchJoshuaProject(lat, lng, radius) {
    const url = `${JP_API_BASE_URL}/peoples`;
    const params = new URLSearchParams({
        api_key: JP_API_KEY,
        latitude: lat,
        longitude: lng,
        radius: radius
    });

    try {
        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching from Joshua Project:', error);
        return [];
    }
}

export async function loadCSVData() {
    try {
        const [fpgResponse, uupgResponse] = await Promise.all([
            fetch('data/fpg.csv'),
            fetch('data/uupg.csv')
        ]);
        
        const fpgData = await fpgResponse.text();
        const uupgData = await uupgResponse.text();
        
        return {
            fpg: parseCSV(fpgData),
            uupg: parseCSV(uupgData)
        };
    } catch (error) {
        console.error('Error loading CSV data:', error);
        return { fpg: [], uupg: [] };
    }
}
