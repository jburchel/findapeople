// Load environment variables
async function loadEnvVariables() {
    try {
        const response = await fetch('/.env');
        const text = await response.text();
        
        // Parse .env file
        const envVars = {};
        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=');
                if (key && value) {
                    envVars[key.trim()] = value.trim();
                }
            }
        });
        
        // Set environment variables globally
        window.env = envVars;
        
        // Update config with environment variables
        if (window.appConfig) {
            window.appConfig.joshuaProjectApiKey = envVars.JOSHUA_PROJECT_API_KEY || '';
            window.appConfig.firebaseConfig = {
                apiKey: envVars.FIREBASE_API_KEY || '',
                authDomain: envVars.FIREBASE_AUTH_DOMAIN || '',
                projectId: envVars.FIREBASE_PROJECT_ID || '',
                storageBucket: envVars.FIREBASE_STORAGE_BUCKET || ''
            };
        }
        
        console.log('Environment variables loaded successfully');
    } catch (error) {
        console.error('Error loading environment variables:', error);
    }
}

// Load environment variables when the script loads
loadEnvVariables();
