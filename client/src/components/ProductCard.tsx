import { Link } from "wouter";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { Product } from "@shared/schema";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart(product.id, 1);
  };
  
  // Check if product has a discount
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
    : 0;
  
  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden product-card relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="product-content">
        <Link href={`/product/${product.slug}`}>
          <div className="relative overflow-hidden">
            <motion.div
              animate={isHovered ? { scale: 1.04 } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-52 object-cover"
              />
            </motion.div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Badge - can be "New", "Organic", or "Sale" */}
            {product.badge && (
              <motion.span 
                className="absolute top-2 left-2 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full shadow-sm"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {product.badge}
              </motion.span>
            )}
            
            {/* Discount percentage badge */}
            {hasDiscount && (
              <motion.div
                className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {discountPercentage}% OFF
              </motion.div>
            )}
          </div>
          
          <div className="p-5">
            {/* Category */}
            <div className="mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{product.category}</span>
            </div>
            
            {/* Name */}
            <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3.5rem]">
              {product.name}
            </h3>
            
            {/* Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
              {product.shortDescription}
            </p>
            
            {/* Rating stars */}
            <div className="flex items-center mb-4">
              <div className="flex text-amber-400">
                {/* Generate filled stars based on rating */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1;
                  const rating = parseFloat(product.rating || '0');
                  
                  // Full star
                  if (starValue <= Math.floor(rating)) {
                    return (
                      <svg 
                        key={i} 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path 
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
                        />
                      </svg>
                    );
                  }
                  // Half star
                  else if (Math.ceil(rating) === starValue) {
                    return (
                      <svg 
                        key={i} 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path 
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
                          fillOpacity="0.5"
                        />
                      </svg>
                    );
                  }
                  // Empty star
                  else {
                    return (
                      <svg 
                        key={i} 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        opacity="0.3"
                      >
                        <path 
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
                        />
                      </svg>
                    );
                  }
                })}
                <span className="text-xs text-gray-500 ml-1">({product.reviewCount || 0})</span>
              </div>
            </div>
            
            {/* Price information */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <motion.span 
                    className="text-xl font-bold text-green-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    ₹{product.price}
                  </motion.span>
                  {hasDiscount && (
                    <span className="text-gray-500 line-through text-sm">₹{product.comparePrice}</span>
                  )}
                </div>
                {product.weightOptions && (
                  <div className="text-xs text-gray-500 mt-1">
                    {Object.keys(product.weightOptions).length} weight options
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
        
        {/* Add to cart button - positioned outside of Link to prevent navigation issues */}
        <div className="absolute bottom-4 right-4">
          <motion.button 
            onClick={handleAddToCart} 
            className="sheen-button bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition-colors text-sm font-medium shadow-lg flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={t('addToCart')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('addToCart')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
