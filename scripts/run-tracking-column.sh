#!/bin/bash

# Make sure we're in the project root
cd "$(dirname "$0")/.." || exit

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found"
  exit 1
fi

# Check if DATABASE_URL is defined
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not defined in .env file"
  exit 1
fi

echo "Running column migration script..."
npx tsx scripts/add-tracking-column.ts

echo "Script completed."