#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const IGNORED_FILES = [
    'package-lock.json',
    'yarn.lock',
    '.env'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const RESTRICTED_EXTENSIONS = ['.exe', '.dll', '.so', '.dylib'];

function getChangedFiles() {
    // Get both modified and deleted files
    const modified = execSync('git diff --cached --name-only --diff-filter=ACMR').toString().split('\n').filter(Boolean);
    return modified;
}

function validateFileSize(file) {
    try {
        const stats = fs.statSync(file);
        return stats.size <= MAX_FILE_SIZE;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File was deleted, skip size validation
            return true;
        }
        throw error;
    }
}

function validateFileExtension(file) {
    const ext = file.slice(file.lastIndexOf('.'));
    return !RESTRICTED_EXTENSIONS.includes(ext);
}

function validateFile(file) {
    if (IGNORED_FILES.includes(file)) {
        return true;
    }

    try {
        if (!validateFileExtension(file)) {
            console.error(`Error: ${file} has a restricted file extension`);
            return false;
        }

        if (!validateFileSize(file)) {
            console.error(`Error: ${file} is too large (max size: 10MB)`);
            return false;
        }

        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File was deleted, skip validation
            return true;
        }
        console.error(`Error validating ${file}:`, error.message);
        return false;
    }
}

// Main execution
try {
    const changedFiles = getChangedFiles();
    const validations = changedFiles.map(validateFile);

    if (validations.every(Boolean)) {
        process.exit(0);
    } else {
        process.exit(1);
    }
} catch (error) {
    console.error('Pre-commit hook failed:', error.message);
    process.exit(1);
}
