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

echo "Running database rebuild script..."
npx tsx scripts/rebuild-tables.ts

echo "Script completed."