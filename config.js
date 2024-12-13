// Configuration
const config = {
    // Firebase configuration
    firebaseConfig: {
        apiKey: "AIzaSyBtzaibXTCspENsEVaN8XF5DkuizsjxVX4",
        authDomain: "crossover-people-finder.firebaseapp.com",
        projectId: "crossover-people-finder",
        storageBucket: "crossover-people-finder.firebasestorage.app"
    },
    
    // Joshua Project API configuration
    joshuaProjectApiKey: process.env.JOSHUA_PROJECT_API_KEY || '',
    
    // API endpoints
    apiEndpoints: {
        joshuaProject: 'https://api.joshuaproject.net/v1'
    }
};

// Export the configuration
window.appConfig = config;
