import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useTranslation } from "@/contexts/LanguageContext";
import LanguageSelector from "./LanguageSelector";
import logoPath from "@assets/LOGO-removebg-preview.png";

export default function Header() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [location] = useLocation();
  const { cartItems } = useCart();
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);

  // Calculate total items in cart - ensure cartItems is an array
  const cartItemCount = Array.isArray(cartItems) 
    ? cartItems.reduce((total, item) => total + (item.quantity || 0), 0)
    : 0;

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  // Check if current path matches (for active links)
  const isActivePath = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  // Handle scroll event for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header 
      className={`fixed w-full top-0 z-50 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-yellow-200'}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="container mx-auto px-4 md:px-12 lg:px-16 py-1 md:py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="py-0 flex-shrink-0"
          >
            <Link href="/" className="flex items-center">
              <motion.img 
                src={logoPath} 
                alt="Millikit Logo" 
                className="h-16 md:h-20 w-auto py-1" 
                whileHover={{ rotate: [0, -5, 5, -5, 0], transition: { duration: 0.5 } }}
              />
            </Link>
          </motion.div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {['/', '/products', '/contact'].map((path, index) => (
              <motion.div
                key={path}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (index * 0.1), duration: 0.5 }}
              >
                <Link 
                  href={path} 
                  className={`${isActivePath(path === '/' ? path : path.substring(1)) ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'} transition-colors text-lg py-1`}
                >
                  {path === '/' ? t('home') : path === '/products' ? t('products') : t('contact')}
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Action icons */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Language Selector for Desktop - only visible on desktop */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            
            {/* Admin login icon removed for security */}
            
            {/* Cart icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ scale: 1.1 }}
              className="py-1"
            >
              <Link href="/cart" className="relative text-gray-700 hover:text-green-600 transition-colors">
                <i className="fas fa-shopping-cart text-2xl"></i>
                <AnimatePresence>
                  {cartItemCount > 0 && (
                    <motion.span 
                      className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold shadow-sm"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      {cartItemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
            
            {/* Language Selector for Mobile - only visible on mobile */}
            <div className="block md:hidden">
              <LanguageSelector />
            </div>
            
            {/* Mobile menu toggle */}
            <motion.button 
              className="md:hidden text-gray-700 py-1"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              whileTap={{ scale: 0.9 }}
            >
              <i className={`fas ${showMobileMenu ? 'fa-times' : 'fa-bars'} text-2xl`}></i>
            </motion.button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              className="md:hidden py-4 mt-4 bg-white/95 backdrop-blur-md rounded-lg shadow-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {['/', '/products', '/contact'].map((path, index) => (
                <motion.div
                  key={path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                >
                  <Link 
                    href={path}
                    className={`block py-4 px-5 ${isActivePath(path === '/' ? path : path.substring(1)) ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'} transition-colors border-b border-gray-100 last:border-b-0 text-lg`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {path === '/' ? t('home') : 
                      path === '/products' ? t('products') : 
                      t('contact')}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
