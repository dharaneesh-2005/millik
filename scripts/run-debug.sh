#!/bin/bash

# Export environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_sgLJlrifxo30@ep-square-smoke-a474p4jk.us-east-1.aws.neon.tech/neondb?sslmode=require"
export PGDATABASE="neondb"
export PGHOST="ep-square-smoke-a474p4jk.us-east-1.aws.neon.tech"
export PGPORT="5432"
export PGUSER="neondb_owner"
export PGPASSWORD="npg_sgLJlrifxo30"

# Run the script
npx tsx debug-product-deletion.ts "$@"