import { motion } from "framer-motion";
import logoPath from "@assets/LOGO-removebg-preview.png";

interface LogoLoaderProps {
  size?: "small" | "medium" | "large";
  text?: string;
}

export default function LogoLoader({ size = "medium", text }: LogoLoaderProps) {
  const sizeClasses = {
    small: "h-10 w-10",
    medium: "h-16 w-16",
    large: "h-24 w-24",
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <motion.div
          animate={{ 
            rotateY: [0, 180, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotateY: { 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            },
            scale: {
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className={`${sizeClasses[size]}`}
        >
          <img src={logoPath} alt="Loading" className="w-full h-full" />
        </motion.div>
        
        {/* Add a subtle glow effect */}
        <motion.div 
          className="absolute inset-0 rounded-full bg-green-200 opacity-50 z-[-1]"
          animate={{ 
            opacity: [0.2, 0.5, 0.2],
            scale: [0.8, 1.1, 0.8]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {text && (
        <motion.p 
          className="mt-4 text-green-700 font-medium text-center"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}