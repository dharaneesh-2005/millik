import { CartItem, Product } from "@shared/schema";

/**
 * Calculate the cart summary including subtotal, shipping, tax, and total
 */
export function calculateCartSummary(cartItems: (CartItem & { product?: Product })[] | null | undefined) {
  // Ensure cartItems is an array
  if (!cartItems || !Array.isArray(cartItems)) {
    return { subtotal: 0, shipping: 0, tax: 0, total: 0 };
  }
  
  // Calculate subtotal
  const subtotal = cartItems.reduce((total, item) => {
    // Use displayPrice (set for weight-specific pricing) if available, otherwise use default price
    const price = parseFloat(item.product?.displayPrice || item.product?.price || "0");
    return total + (price * (item.quantity || 0));
  }, 0);
  
  // Calculate shipping (free shipping over ₹1000, otherwise ₹100)
  const shipping = subtotal > 1000 ? 0 : 100;
  
  // Calculate tax (5% GST)
  const tax = subtotal * 0.05;
  
  // Calculate total
  const total = subtotal + shipping + tax;
  
  return {
    subtotal,
    shipping,
    tax,
    total
  };
}

/**
 * Format price in rupees
 */
export function formatPrice(price: string | number) {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `₹${numPrice.toFixed(2)}`;
}

/**
 * Calculate savings percentage when a compare price is available
 */
export function calculateSavingsPercentage(price: string, comparePrice: string | null | undefined) {
  if (!comparePrice) return 0;
  
  const actualPrice = parseFloat(price);
  const originalPrice = parseFloat(comparePrice);
  
  return Math.round((1 - (actualPrice / originalPrice)) * 100);
}
