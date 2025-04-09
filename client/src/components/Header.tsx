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
      className={`fixed w-full top-0 z-50 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-yellow-400'}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="container mx-auto px-4 md:px-12 lg:px-16 py-4 md:py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link href="/" className="flex items-center">
              <motion.img 
                src={logoPath} 
                alt="Millikit Logo" 
                className="h-10 md:h-14 w-auto" 
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
                  className={`${isActivePath(path === '/' ? path : path.substring(1)) ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'} transition-colors text-lg`}
                >
                  {path === '/' ? t('home') : path === '/products' ? t('products') : t('contact')}
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Action icons */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Language Selector for Desktop - only visible on desktop */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            
            {/* Admin login icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ scale: 1.1 }}
            >
              <Link href="/admin/login" className="text-gray-700 hover:text-green-600 transition-colors">
                <i className="fas fa-user-shield text-xl"></i>
              </Link>
            </motion.div>
            
            {/* Cart icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ scale: 1.1 }}
            >
              <Link href="/cart" className="relative text-gray-700 hover:text-green-600 transition-colors">
                <i className="fas fa-shopping-cart text-xl"></i>
                <AnimatePresence>
                  {cartItemCount > 0 && (
                    <motion.span 
                      className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full"
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
              className="md:hidden text-gray-700"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              whileTap={{ scale: 0.9 }}
            >
              <i className={`fas ${showMobileMenu ? 'fa-times' : 'fa-bars'}`}></i>
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
              {['/', '/products', '/contact', '/admin/login'].map((path, index) => (
                <motion.div
                  key={path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                >
                  <Link 
                    href={path}
                    className={`block py-3 px-4 ${isActivePath(path === '/' ? path : path.substring(1)) ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'} transition-colors border-b border-gray-100 last:border-b-0`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {path === '/' ? t('home') : 
                      path === '/products' ? t('products') : 
                      path === '/contact' ? t('contact') : 
                      'Admin'}
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
