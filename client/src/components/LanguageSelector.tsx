import { useTranslation } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  // Simple direct toggle without animations or delays
  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "ta" : "en";
    setLanguage(newLanguage);
  };

  return (
    <>
      {/* Desktop language selector */}
      <div className="hidden md:flex items-center">
        <motion.select 
          value={language}
          onChange={(e) => setLanguage(e.target.value as "en" | "ta")}
          className="bg-white border border-gray-300 rounded-full px-4 py-2 text-base font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <option value="en">English</option>
          <option value="ta">தமிழ்</option>
        </motion.select>
      </div>

      {/* Mobile language button */}
      <motion.button 
        onClick={toggleLanguage}
        className="md:hidden text-gray-700 flex items-center justify-center"
        aria-label="Toggle language"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="relative">
          <i className="fas fa-globe text-2xl"></i>
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold text-[10px] shadow-sm">
            {language === "en" ? "EN" : "TA"}
          </span>
        </div>
      </motion.button>
    </>
  );
}
