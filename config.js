// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBtzaibXTCspENsEVaN8XF5DkuizsjxVX4",  // Fallback for development
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "crossover-people-finder.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "crossover-people-finder",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "crossover-people-finder.firebasestorage.app"
};

export default firebaseConfig;
