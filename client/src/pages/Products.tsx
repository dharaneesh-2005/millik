import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useTranslation } from "@/contexts/LanguageContext";
import ProductCard from "@/components/ProductCard";
import { Product } from "@shared/schema";

export default function Products() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const productsPerPage = 6;
  
  // Fetch all products
  const { data: allProducts, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Fetch products by search if query exists
  const { data: searchResults, isLoading: isSearchLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/search", debouncedQuery],
    queryFn: () => fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`).then(res => res.json()),
    enabled: debouncedQuery.length > 0,
  });
  
  // Set page title
  useEffect(() => {
    document.title = `${t('products')} - Millikit`;
  }, [t]);
  
  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        setDebouncedQuery(searchQuery);
      } else {
        setDebouncedQuery("");
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  
  // Filter and sort products
  const filteredProducts = (() => {
    let filtered = searchQuery ? searchResults || [] : allProducts || [];
    
    // Apply category filter if not searching
    if (category !== "all" && !searchQuery) {
      filtered = filtered.filter(product => product.category === category);
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price-desc":
          return parseFloat(b.price) - parseFloat(a.price);
        case "name-asc":
          return a.name.localeCompare(b.name);
        default: // "featured"
          return a.featured === b.featured ? 0 : a.featured ? -1 : 1;
      }
    });
  })();
  
  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );
  
  // Generate pagination buttons
  const paginationButtons = [];
  for (let i = 1; i <= totalPages; i++) {
    paginationButtons.push(
      <button
        key={i}
        onClick={() => setCurrentPage(i)}
        className={`px-3 py-1 mx-1 rounded ${
          currentPage === i
            ? "bg-green-600 text-white"
            : "bg-white text-gray-800 hover:bg-gray-100"
        }`}
      >
        {i}
      </button>
    );
  }
  
  // Handle previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Handle next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [category, sortBy, debouncedQuery]);
  
  return (
    <>
      {/* Products Header */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-green-600 to-green-700 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-noise opacity-10 mix-blend-overlay pointer-events-none"></div>
        <motion.div 
          className="absolute -bottom-10 -right-10 w-64 h-64 bg-green-500/20 rounded-full" 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0],
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        <motion.div 
          className="absolute -left-16 top-16 w-40 h-40 bg-amber-400/10 rounded-full"
          animate={{ 
            scale: [1, 1.15, 1],
            y: [0, 10, 0],
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.h1 
              className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              {t('products')}
            </motion.h1>
            <motion.p 
              className="text-green-50 text-xl max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Discover our range of high-quality, organic millet products sourced directly from farmers
            </motion.p>
          </motion.div>
          
          {/* Breadcrumb */}
          <motion.div 
            className="flex items-center space-x-2 mt-4 text-green-100/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Link href="/" className="hover:text-white transition-colors">
              <motion.span whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 300 }}>
                {t('home')}
              </motion.span>
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{t('products')}</span>
          </motion.div>
        </div>
      </section>
      
      {/* Filter Section */}
      <section className="py-10 bg-white border-b shadow-sm relative z-20">
        <div className="container mx-auto px-6">
          <motion.div 
            className="bg-white rounded-xl shadow-md p-6 mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex-grow">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search for millet products..."
                    className="w-full pl-10 pr-4 py-3 border-gray-200 border rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <i className="fas fa-filter text-gray-500"></i>
                <span className="text-sm text-gray-600 font-medium">Filters:</span>
              </div>
            </div>
          </motion.div>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{t('filterBy')}:</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border rounded-full px-4 py-2 text-gray-700 focus:outline-none focus:border-green-500 cursor-pointer"
                >
                  <option value="all">{t('allCategories')}</option>
                  <option value="organic">{t('organic')}</option>
                  <option value="mixed">{t('mixed')}</option>
                  <option value="specialty">{t('specialty')}</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{t('sortBy')}:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-full px-4 py-2 text-gray-700 focus:outline-none focus:border-green-500 cursor-pointer"
                >
                  <option value="featured">{t('featured')}</option>
                  <option value="price-asc">{t('priceLowToHigh')}</option>
                  <option value="price-desc">{t('priceHighToLow')}</option>
                  <option value="name-asc">{t('nameAToZ')}</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">{t('view')}:</span>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${
                  viewMode === "grid" ? "text-green-600" : "text-gray-400"
                } hover:bg-green-50 rounded-lg transition-colors`}
                aria-label="Grid view"
              >
                <i className="fas fa-th-large text-lg"></i>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${
                  viewMode === "list" ? "text-green-600" : "text-gray-400"
                } hover:bg-green-50 rounded-lg transition-colors`}
                aria-label="List view"
              >
                <i className="fas fa-list text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          {isLoading || isSearchLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
              {currentProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No products found.</p>
            </div>
          )}
          
          {/* Results Count */}
          {filteredProducts.length > 0 && (
            <div className="mt-8 text-center text-gray-600">
              {t('showing')} {(currentPage - 1) * productsPerPage + 1}-
              {Math.min(currentPage * productsPerPage, filteredProducts.length)} {t('of')}{" "}
              {filteredProducts.length} {t('products')}
            </div>
          )}
          
          {/* Pagination */}
          {filteredProducts.length > productsPerPage && (
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-white text-gray-800 rounded disabled:opacity-50"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                {paginationButtons}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-white text-gray-800 rounded disabled:opacity-50"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </nav>
            </div>
          )}
        </div>
      </section>
    </>
  );
}