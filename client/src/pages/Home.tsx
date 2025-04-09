import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTranslation } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import ProductCard from "@/components/ProductCard";
import { Product } from "@shared/schema";

export default function Home() {
  const { t } = useTranslation();
  const { addToCart } = useCart();

  // Fetch featured products
  const { data: featuredProducts, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/featured"],
  });

  // Set page title
  useEffect(() => {
    document.title = "Millikit - Premium Millet Store";
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section
        id="home"
        className="relative overflow-hidden min-h-screen flex items-center pt-16 md:pt-0 bg-gradient-to-br from-white via-green-50 to-amber-50"
      >
        {/* Large background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -top-24 -right-24 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-green-100/30 to-green-300/20"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 10, 0],
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
          <motion.div 
            className="absolute -bottom-32 -left-32 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-amber-100/30 to-amber-200/20"
            animate={{ 
              scale: [1, 1.15, 1],
              rotate: [0, -15, 0],
            }}
            transition={{ 
              duration: 25, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
        </div>
        
        {/* Animated grain texture overlay */}
        <div className="absolute inset-0 bg-noise opacity-10 mix-blend-overlay pointer-events-none"></div>
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating leaf elements */}
          <motion.div 
            className="absolute top-[20%] right-[15%] w-6 h-12 bg-green-400/20 rounded-full rotate-45"
            animate={{ 
              y: [0, -30, 0],
              rotate: [45, 60, 45],
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
          
          <motion.div 
            className="absolute top-[60%] left-[10%] w-6 h-12 bg-green-300/15 rounded-full rotate-[30deg]"
            animate={{ 
              y: [0, -40, 0],
              rotate: [30, 45, 30],
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
          
          <motion.div 
            className="absolute bottom-[25%] right-[25%] w-4 h-10 bg-amber-400/15 rounded-full rotate-[15deg]"
            animate={{ 
              y: [0, -20, 0],
              rotate: [15, 30, 15],
            }}
            transition={{ 
              duration: 7, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
          
          {/* Grain particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full ${
                i % 3 === 0 ? 'bg-amber-300/30' : 
                i % 3 === 1 ? 'bg-green-300/30' : 'bg-yellow-200/30'
              }`}
              style={{
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                left: `${Math.random() * 90}%`,
                top: `${Math.random() * 80}%`,
              }}
              animate={{
                y: [0, Math.random() * -60 - 20, 0],
                x: [0, Math.random() * 40 - 20, 0],
                scale: [1, Math.random() * 0.5 + 1, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>
        
        {/* Content container with modern grid layout */}
        <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24 relative z-10">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
          
            {/* Left content column - takes up 7/12 on medium+ screens */}
            <motion.div
              className="md:col-span-7 text-left"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-6"
              >
                <span className="inline-block bg-green-600/10 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium">
                  Pure Organic Millet Products
                </span>
              </motion.div>
              
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-[1.1]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="block mb-2">Healthier Choice for</span>
                <span className="bg-gradient-to-r from-green-600 to-amber-600 bg-clip-text text-transparent">Modern Living</span>
              </motion.h1>
              
              <motion.p
                className="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                Experience the perfect blend of tradition and nutrition with our premium millet products, sustainably sourced from local farmers and crafted for your wellbeing.
              </motion.p>
              
              <motion.div
                className="flex flex-wrap gap-4 mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/products"
                    className="bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-4 rounded-full font-medium text-lg inline-flex items-center gap-2 shadow-md"
                  >
                    <span>Shop Now</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-xl"
                    >
                      →
                    </motion.span>
                  </Link>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <a
                    href="#about"
                    className="bg-white/80 backdrop-blur-sm text-green-700 px-8 py-4 rounded-full font-medium text-lg border border-green-100 inline-flex items-center shadow-sm hover:bg-white transition-colors"
                  >
                    Learn More
                  </a>
                </motion.div>
              </motion.div>
              
              {/* Product features with icons */}
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                {[
                  { icon: "fas fa-leaf", text: "100% Organic" },
                  { icon: "fas fa-heart", text: "Nutrient Rich" },
                  { icon: "fas fa-truck", text: "Free Delivery" }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + (index * 0.1), duration: 0.5 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <i className={feature.icon}></i>
                    </div>
                    <span className="text-gray-700 font-medium">{feature.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
            
            {/* Right image column - takes up 5/12 on medium+ screens */}
            <motion.div
              className="md:col-span-5 relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="relative">
                {/* Decorative circue behind the image */}
                <motion.div
                  className="absolute inset-0 -m-6 bg-gradient-to-br from-amber-100 to-green-100 rounded-full opacity-80"
                  animate={{ 
                    scale: [1, 1.03, 1],
                    rotate: [0, 1, 0],
                  }}
                  transition={{ 
                    duration: 8, 
                    repeat: Infinity,
                    repeatType: "reverse" 
                  }}
                />
                
                <motion.div
                  className="relative z-10 rounded-3xl overflow-hidden shadow-2xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.img
                    src="https://i.postimg.cc/63kPskR7/create-a-visually-appealing-homepage-banner-for-m-1.png"
                    alt="Organic millet products"
                    className="w-full h-auto object-cover"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                  
                  {/* Gradient overlay to blend image with background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl pointer-events-none" />
                </motion.div>
                
                {/* Floating badge element */}
                <motion.div
                  className="absolute -bottom-6 -right-6 bg-white px-5 py-4 rounded-xl text-sm font-bold shadow-lg z-20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  whileHover={{ y: -5, boxShadow: "0 15px 30px rgba(0, 0, 0, 0.1)" }}
                >
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="text-amber-500 text-xl"
                      animate={{ rotate: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <i className="fas fa-tag"></i>
                    </motion.div>
                    <div className="text-gray-800">
                      Free shipping on orders over ₹500
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-28 relative overflow-hidden">
        {/* Background with subtle pattern */}
        <div className="absolute inset-0 bg-white bg-opacity-95"></div>
        
        {/* Background decorative elements */}
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-bl from-amber-100/30 to-amber-50/10"
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 3, 0],
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-gradient-to-tr from-green-100/30 to-green-50/10"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, -3, 0],
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        
        {/* Leaf floating elements */}
        <motion.div 
          className="absolute right-[10%] top-[30%] w-10 h-16 rounded-full bg-green-200/20 rotate-[30deg]"
          animate={{ 
            y: [0, -20, 0],
            rotate: [30, 40, 30],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
          }}
        />
        <motion.div 
          className="absolute left-[15%] top-[60%] w-8 h-12 rounded-full bg-amber-200/20 rotate-[15deg]"
          animate={{ 
            y: [0, -15, 0],
            rotate: [15, 25, 15],
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity,
          }}
        />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6 }}
            className="mb-16 md:mb-20 text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-4"
            >
              <span className="inline-block px-4 py-1.5 bg-green-50 text-green-700 font-medium rounded-full text-sm">
                Our Journey
              </span>
            </motion.div>
            
            <motion.h2 
              className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              The <span className="text-green-600">Millikit</span> Story
            </motion.h2>
            
            <motion.p
              className="text-lg text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Discovering the perfect balance between ancient wisdom and modern nutrition
            </motion.p>
          </motion.div>
          
          <div className="grid md:grid-cols-12 gap-y-12 md:gap-x-16 items-center max-w-7xl mx-auto">
            {/* Image column - 5 columns on desktop */}
            <motion.div 
              className="md:col-span-5 relative"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative">
                {/* Image container with shadow and hover effect */}
                <motion.div 
                  className="relative z-10 rounded-3xl overflow-hidden shadow-xl"
                  whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                  transition={{ duration: 0.4 }}
                >
                  <img
                    src="https://images.pexels.com/photos/7511753/pexels-photo-7511753.jpeg"
                    alt="About Millikit"
                    className="w-full h-auto object-cover"
                  />
                  
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-3xl"></div>
                </motion.div>
                
                {/* Decorative pattern behind the image */}
                <div className="absolute -bottom-6 -right-6 w-full h-full bg-noise opacity-10 rounded-3xl border border-green-100 -z-10"></div>
                
                {/* Floating stats cards */}
                <motion.div
                  className="absolute -bottom-8 right-8 bg-white px-5 py-4 rounded-xl shadow-xl z-20"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="flex items-center">
                    <span className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-full text-green-600 mr-3">
                      <i className="fas fa-award"></i>
                    </span>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">10+</div>
                      <div className="text-sm text-gray-600">Years of Excellence</div>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  className="absolute -top-8 -left-8 bg-white px-5 py-4 rounded-xl shadow-xl z-20"
                  initial={{ opacity: 0, y: -20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  whileHover={{ y: 5 }}
                >
                  <div className="flex items-center">
                    <span className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-full text-amber-600 mr-3">
                      <i className="fas fa-users"></i>
                    </span>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">50+</div>
                      <div className="text-sm text-gray-600">Partner Farmers</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Content column - 7 columns on desktop */}
            <motion.div 
              className="md:col-span-7"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h3 
                className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                From Fields to <span className="text-green-600">Your Table</span>
              </motion.h3>
              
              <div className="space-y-6 text-lg text-gray-600 leading-relaxed mb-8">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  At Millikit, we're passionate about reviving ancient grains for modern lifestyles. Our journey began with a simple vision: to bring the extraordinary benefits of millets to every household while supporting sustainable farming practices.
                </motion.p>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  We work directly with a network of dedicated organic farmers who share our commitment to quality and sustainability. Every grain in our products is carefully selected, processed with minimal intervention, and packaged to preserve its nutritional integrity.
                </motion.p>
              </div>
              
              {/* Feature points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                {[
                  { icon: "fas fa-check-circle", title: "100% Organic", text: "No pesticides or chemicals" },
                  { icon: "fas fa-heart", title: "Nutrient Dense", text: "Rich in essential minerals" },
                  { icon: "fas fa-seedling", title: "Sustainably Grown", text: "Supporting eco-friendly farming" },
                  { icon: "fas fa-utensils", title: "Ready to Cook", text: "Simple, convenient preparations" }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + (index * 0.1) }}
                  >
                    <div className="text-green-500 mt-1 mr-3">
                      <i className={feature.icon}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                      <p className="text-gray-600 text-sm">{feature.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* CTA buttons */}
              <motion.div 
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href="/products"
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-medium inline-flex items-center gap-2 shadow-md transition-colors"
                  >
                    <span>Explore Products</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </Link>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href="/contact"
                    className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-2 transition-colors px-4 py-3"
                  >
                    <span>Contact Us</span>
                    <i className="fas fa-arrow-right text-sm"></i>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-gray-100 relative overflow-hidden">
        {/* Background decoration */}
        <motion.div 
          className="absolute right-0 bottom-0 w-64 h-64 bg-green-200 rounded-full opacity-20 -mr-32 -mb-32"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0],
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity,
          }}
        />
        <motion.div 
          className="absolute top-24 left-0 w-32 h-32 bg-yellow-200 rounded-full opacity-20 -ml-16"
          animate={{ 
            scale: [1, 1.2, 1],
            y: [0, 20, 0],
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity,
          }}
        />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="mb-16 max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-4 py-1 rounded-full mb-3">
              Why Choose Us
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Benefits of Choosing <span className="text-green-600">Millikit</span>
            </h2>
            <p className="text-gray-600 md:text-lg">
              We're committed to providing you with the best quality millet products while supporting sustainable farming practices
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
            {/* Feature 1 */}
            <motion.div
              className="bg-white rounded-xl shadow-md p-6 overflow-hidden relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ 
                y: -5,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <motion.div
                className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <motion.i
                  className="fas fa-seedling text-2xl text-green-600"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </motion.div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                100% Organic
              </h3>
              
              <p className="text-gray-600 mb-4">
                Carefully sourced from organic farms, ensuring the highest
                quality millets without pesticides.
              </p>
              
              <motion.div
                className="absolute bottom-0 right-0 w-24 h-24 -mb-8 -mr-8 rounded-full bg-green-50"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 10, 0],
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity,
                }}
              />
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              className="bg-white rounded-xl shadow-md p-6 overflow-hidden relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ 
                y: -5,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <motion.div
                className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mb-6"
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                <motion.i
                  className="fas fa-heart text-2xl text-amber-600"
                  animate={{ 
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              </motion.div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Nutrient-Rich
              </h3>
              
              <p className="text-gray-600 mb-4">
                Packed with essential nutrients, proteins, and minerals for your
                wellbeing and healthy lifestyle.
              </p>
              
              <motion.div
                className="absolute bottom-0 right-0 w-24 h-24 -mb-8 -mr-8 rounded-full bg-amber-50"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -10, 0],
                }}
                transition={{ 
                  duration: 9, 
                  repeat: Infinity,
                }}
              />
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              className="bg-white rounded-xl shadow-md p-6 overflow-hidden relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ 
                y: -5,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <motion.div
                className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <motion.i
                  className="fas fa-truck text-2xl text-green-600"
                  animate={{ x: [0, 10, 0] }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                  }}
                />
              </motion.div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Fast Delivery
              </h3>
              
              <p className="text-gray-600 mb-4">
                Quick and secure delivery right to your doorstep across the
                country with care and precision.
              </p>
              
              <motion.div
                className="absolute bottom-0 right-0 w-24 h-24 -mb-8 -mr-8 rounded-full bg-green-50"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 10, 0],
                }}
                transition={{ 
                  duration: 10, 
                  repeat: Infinity,
                }}
              />
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              className="bg-white rounded-xl shadow-md p-6 overflow-hidden relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ 
                y: -5,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <motion.div
                className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mb-6"
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                <motion.i
                  className="fas fa-leaf text-2xl text-amber-600"
                  animate={{ 
                    rotate: [0, 10, 0, -10, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                  }}
                />
              </motion.div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Eco-Friendly
              </h3>
              
              <p className="text-gray-600 mb-4">
                Sustainable packaging and farming practices to minimize our environmental footprint.
              </p>
              
              <motion.div
                className="absolute bottom-0 right-0 w-24 h-24 -mb-8 -mr-8 rounded-full bg-amber-50"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -10, 0],
                }}
                transition={{ 
                  duration: 11, 
                  repeat: Infinity,
                }}
              />
            </motion.div>
          </div>
          
          {/* Stats Counter */}
          <motion.div 
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white p-8 rounded-xl shadow-lg"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            {[
              { value: "10+", label: "Years Experience" },
              { value: "5,000+", label: "Happy Customers" },
              { value: "12+", label: "Millet Varieties" },
              { value: "95%", label: "Satisfaction Rate" }
            ].map((stat, index) => (
              <motion.div 
                key={index} 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
              >
                <motion.div 
                  className="text-3xl md:text-4xl font-bold text-green-600 mb-2"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, delay: 0.5 + (index * 0.1), repeat: Infinity, repeatDelay: 5 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24 bg-white relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-40 left-10 w-64 h-64 bg-green-50 rounded-full opacity-70"
            animate={{ 
              scale: [1, 1.2, 1],
              y: [0, 30, 0],
            }}
            transition={{ 
              duration: 18, 
              repeat: Infinity,
            }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-80 h-80 bg-amber-50 rounded-full opacity-70"
            animate={{ 
              scale: [1, 1.1, 1],
              y: [0, -20, 0],
            }}
            transition={{ 
              duration: 15, 
              repeat: Infinity,
            }}
          />
        </div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="max-w-2xl mx-auto text-center mb-12 md:mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-4 py-1 rounded-full mb-3">
              Explore Our Products
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              <span className="text-green-600">Featured</span> Products
            </h2>
            <p className="text-gray-600 md:text-lg max-w-3xl mx-auto">
              Discover our most popular millet products, carefully selected for their premium quality, 
              taste, and nutritional benefits
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <motion.div 
                className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6 }}
            >
              {featuredProducts?.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div 
            className="text-center mt-12 md:mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/products"
                className="inline-block bg-green-600 text-white px-8 md:px-10 py-4 rounded-full hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2 mx-auto"
              >
                <span className="font-semibold">View All Products</span>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="max-w-2xl mx-auto text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-4 py-1 rounded-full mb-3">
              What Our Customers Say
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              Customer <span className="text-green-600">Testimonials</span>
            </h2>
            <div className="w-16 h-1 bg-amber-500 mx-auto mb-6 rounded-full"></div>
            <p className="text-gray-600 md:text-lg">
              Don't just take our word for it, hear what our customers have to say about our products
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Priya Sharma",
                title: "Health Coach",
                image: "https://randomuser.me/api/portraits/women/12.jpg",
                content: "The millet products from Millikit have become a staple in my household. The quality is exceptional, and I love how they've maintained the traditional taste while making it convenient for modern cooking."
              },
              {
                name: "Rahul Mehta",
                title: "Fitness Enthusiast",
                image: "https://randomuser.me/api/portraits/men/32.jpg",
                content: "As someone who's conscious about nutrition, I highly recommend their organic foxtail millet. It's become an essential part of my post-workout meals. The protein content is impressive, and it tastes delicious!"
              },
              {
                name: "Ananya Patel",
                title: "Home Chef",
                image: "https://randomuser.me/api/portraits/women/65.jpg",
                content: "I've tried several brands, but Millikit stands out for its purity and flavor. Their millet flour makes the most amazing rotis and dosas. My family has switched completely to their products for a healthier lifestyle."
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 md:p-8 rounded-xl shadow-md"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                whileHover={{ 
                  y: -5,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name} 
                    className="w-14 h-14 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.title}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 italic mb-4">"{testimonial.content}"</p>
                
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map(star => (
                    <motion.i 
                      key={star} 
                      className="fas fa-star text-sm mr-1"
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + (0.1 * star) }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-800 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div 
            className="flex flex-col lg:flex-row items-center justify-between max-w-6xl mx-auto gap-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <div className="lg:w-2/3">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Experience the Goodness of Millets?</h2>
              <p className="text-green-100 text-lg mb-6">
                Start your journey towards a healthier lifestyle with our premium millet products. 
                Order now and enjoy the nutritional benefits of this ancient superfood.
              </p>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lg:w-1/3 text-center"
            >
              <Link
                href="/products"
                className="inline-block bg-white text-green-700 px-8 py-4 rounded-full font-bold hover:bg-green-50 transition-colors shadow-lg"
              >
                Shop Now
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
