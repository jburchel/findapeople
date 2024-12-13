#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the current date and time
DATETIME=$(date '+%Y-%m-%d %H:%M:%S')

# Function to generate commit message based on changes
generate_commit_message() {
    local changes=""
    
    # Check for new files
    new_files=$(git status --porcelain | grep '^??' | sed 's/?? //')
    if [ ! -z "$new_files" ]; then
        changes="${changes}Added: $(echo "$new_files" | tr '\n' ',' | sed 's/,$/\n/')\n"
    fi
    
    # Check for modified files
    modified_files=$(git status --porcelain | grep '^ M\|^M' | sed 's/M //')
    if [ ! -z "$modified_files" ]; then
        changes="${changes}Modified: $(echo "$modified_files" | tr '\n' ',' | sed 's/,$/\n/')\n"
    fi
    
    # Check for deleted files
    deleted_files=$(git status --porcelain | grep '^ D\|^D' | sed 's/D //')
    if [ ! -z "$deleted_files" ]; then
        changes="${changes}Deleted: $(echo "$deleted_files" | tr '\n' ',' | sed 's/,$/\n/')\n"
    fi
    
    echo -e "$changes"
}

# Main execution
echo -e "${YELLOW}Starting Git auto-commit process...${NC}"

# Stage all changes
git add -A
echo -e "${GREEN}Changes staged for commit${NC}"

# Generate commit message
commit_message="Auto-commit: ${DATETIME}\n\n$(generate_commit_message)"
echo -e "${YELLOW}Generated commit message:${NC}\n$commit_message"

# Commit changes
echo -e "$commit_message" | git commit -F -
echo -e "${GREEN}Changes committed${NC}"

# Push to remote
echo -e "${YELLOW}Pushing changes to remote...${NC}"
git push
echo -e "${GREEN}Changes pushed successfully${NC}"
