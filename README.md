# Frontier Finder

A web application for finding and searching Frontier People Groups (FPGs) and Unreached Unengaged People Groups (UUPGs).

## Features

- Search for FPGs and UUPGs by country and proximity
- Filter results by type (FPG, UUPG, or both)
- Sort results by distance, type, country, population, or religion
- View Top 100 UPGs list with sortable columns
- Responsive design for mobile and desktop

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Firebase credentials
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   npm install
   ```

## Environment Variables

Create a `.env` file with the following variables:
```
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_auth_domain_here
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
```

## Development

To run the development server:
```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Project Structure

- `/css` - Stylesheet files
- `/data` - Data files for people groups
- `/images` - Image assets
- `/js` - JavaScript files
- `/scripts` - Python scripts for data processing

## Security

- Environment variables are used for sensitive configuration
- Firebase configuration is secured and not exposed in the client
- Input validation is implemented for all user inputs

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

This project is proprietary and confidential.
