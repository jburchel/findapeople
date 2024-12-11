const fs = require('fs');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

// Configuration
const INPUT_FILE = 'data/CG-Existing-UPG-Q1-2024.csv';
const OUTPUT_FILE = 'data/existing_upgs_updated.csv';
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds delay between requests

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeJoshuaProject(peopleGroup, country) {
    try {
        // Format search query
        const searchQuery = `${peopleGroup} ${country}`.trim();
        const searchUrl = `https://joshuaproject.net/search/results?searchfor=${encodeURIComponent(searchQuery)}`;
        
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);
        
        // Find the first people group result link
        const firstResult = $('a[href^="/people_groups/"]').first();
        if (!firstResult.length) {
            return null;
        }

        // Get detailed page
        const detailUrl = 'https://joshuaproject.net' + firstResult.attr('href');
        const detailResponse = await axios.get(detailUrl);
        const $detail = cheerio.load(detailResponse.data);

        // Extract data
        return {
            latitude: $detail('.latitude').text().trim(),
            longitude: $detail('.longitude').text().trim(),
            population: $detail('.population').text().trim(),
            evangelical: $detail('.evangelical').text().trim(),
            language: $detail('.primary-language').text().trim(),
            religion: $detail('.primary-religion').text().trim(),
            description: $detail('.description').text().trim()
        };
    } catch (error) {
        console.error(`Error scraping data for ${peopleGroup} in ${country}:`, error.message);
        return null;
    }
}

async function processData() {
    try {
        // Read input file
        const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');
        const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true });

        // Filter records with country
        const validRecords = records.filter(record => record.country && record.country.trim());

        // Process each record
        const updatedRecords = [];
        for (const record of validRecords) {
            console.log(`Processing: ${record.name} in ${record.country}`);
            
            const jpData = await scrapeJoshuaProject(record.name, record.country);
            await sleep(DELAY_BETWEEN_REQUESTS);

            if (jpData) {
                updatedRecords.push({
                    ...record,
                    latitude: jpData.latitude || record.latitude,
                    longitude: jpData.longitude || record.longitude,
                    population: jpData.population || record.population,
                    evangelical: jpData.evangelical || record.evangelical,
                    language: jpData.language || record.language,
                    religion: jpData.religion || record.religion,
                    description: jpData.description || record.description
                });
            } else {
                // Keep original record if no new data found
                updatedRecords.push(record);
            }
        }

        // Write output file
        const output = stringify(updatedRecords, { header: true });
        fs.writeFileSync(OUTPUT_FILE, output);

        console.log(`Processing complete. Results written to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error processing data:', error);
    }
}

// Run the script
processData(); 