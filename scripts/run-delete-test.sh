#!/bin/bash

# Set environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_sgLJlrifxo30@ep-square-smoke-a474p4jk.us-east-1.aws.neon.tech/neondb?sslmode=require"
export PGDATABASE="neondb"
export PGHOST="ep-square-smoke-a474p4jk.us-east-1.aws.neon.tech"
export PGPORT="5432"
export PGUSER="neondb_owner"
export PGPASSWORD="npg_sgLJlrifxo30"
export ADMIN_KEY="admin-secret"

# If product ID is provided as argument, use it, otherwise use a default
PRODUCT_ID=${1:-10}

echo "Testing product deletion with direct database operations"
echo "========================================================"
echo "Product ID: $PRODUCT_ID"
echo

# Check for existing order_items referencing the product
echo "Checking for order_items referencing this product..."
ORDER_ITEMS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM order_items WHERE product_id = $PRODUCT_ID")
echo "Found $ORDER_ITEMS order items referencing this product"

if [ "$ORDER_ITEMS" -gt 0 ]; then
    echo "Deleting order_items for product ID $PRODUCT_ID..."
    psql "$DATABASE_URL" -c "DELETE FROM order_items WHERE product_id = $PRODUCT_ID"
    echo "Order items deleted."
fi

# Check for existing cart_items referencing the product
echo "Checking for cart_items referencing this product..."
CART_ITEMS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM cart_items WHERE product_id = $PRODUCT_ID")
echo "Found $CART_ITEMS cart items referencing this product"

if [ "$CART_ITEMS" -gt 0 ]; then
    echo "Deleting cart_items for product ID $PRODUCT_ID..."
    psql "$DATABASE_URL" -c "DELETE FROM cart_items WHERE product_id = $PRODUCT_ID"
    echo "Cart items deleted."
fi

# Now directly delete the product
echo "Directly deleting product..."
RESULT=$(psql "$DATABASE_URL" -c "DELETE FROM products WHERE id = $PRODUCT_ID")
echo "Delete operation result: $RESULT"

# Verify product is deleted
echo "Verifying product deletion..."
PRODUCT_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM products WHERE id = $PRODUCT_ID")
if [ "$PRODUCT_CHECK" -eq 0 ]; then
    echo "SUCCESS: Product with ID $PRODUCT_ID has been deleted."
else
    echo "ERROR: Product with ID $PRODUCT_ID still exists in the database."
fi