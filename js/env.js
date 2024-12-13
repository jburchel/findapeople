// Load environment variables
async function loadEnvVariables() {
    try {
        const response = await fetch('/.env');
        if (!response.ok) {
            throw new Error('Failed to load .env file');
        }
        
        const text = await response.text();
        
        // Parse .env file
        const envVars = {};
        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=');
                if (key && value) {
                    envVars[key.trim()] = value.trim().replace(/["']/g, ''); // Remove quotes if present
                }
            }
        });
        
        // Set environment variables globally
        window.env = envVars;
        
        console.log('Environment variables loaded successfully');
        
        // Verify Joshua Project API key is present
        if (!envVars.JOSHUA_PROJECT_API_KEY) {
            console.error('Joshua Project API key not found in environment variables');
        }
    } catch (error) {
        console.error('Error loading environment variables:', error);
        // Set empty env object to prevent undefined errors
        window.env = {};
    }
}

// Load environment variables when the script loads
loadEnvVariables();
