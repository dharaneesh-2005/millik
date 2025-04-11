import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useTranslation } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const contactSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
  subject: z.string().min(1, { message: "Please select a subject" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" })
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema)
  });

  // Set page title
  useEffect(() => {
    document.title = `${t('contactUs')} - Millikit`;
  }, [t]);

  const onSubmit = async (data: ContactFormValues) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit contact form');
      }
      
      toast({
        title: "Success!",
        description: t('messageSent'),
      });
      
      // Reset form
      reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Error",
        description: t('errorOccurred'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-green-600 to-green-700 relative overflow-hidden">
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
              {t('contactUs')}
            </motion.h1>
            <motion.p 
              className="text-green-50 text-xl max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {t('getInTouch')}
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
            <span className="text-white font-medium">{t('contactUs')}</span>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div 
              className="bg-white p-8 rounded-xl shadow-lg"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('send')}</h2>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="name">{t('name')}</label>
                    <input 
                      type="text" 
                      id="name" 
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.name ? 'border-red-500' : ''}`}
                      {...register("name")}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="email">{t('email')}</label>
                    <input 
                      type="email" 
                      id="email" 
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.email ? 'border-red-500' : ''}`}
                      {...register("email")}
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="phone">{t('phone')}</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.phone ? 'border-red-500' : ''}`}
                      {...register("phone")}
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="subject">{t('subject')}</label>
                    <select 
                      id="subject" 
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.subject ? 'border-red-500' : ''}`}
                      {...register("subject")}
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="support">Product Support</option>
                      <option value="wholesale">Wholesale Query</option>
                      <option value="feedback">Feedback</option>
                    </select>
                    {errors.subject && <p className="mt-1 text-sm text-red-500">{errors.subject.message}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="message">{t('message')}</label>
                    <textarea 
                      id="message" 
                      rows={4} 
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.message ? 'border-red-500' : ''}`}
                      {...register("message")}
                    ></textarea>
                    {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>}
                  </div>
                  <motion.button 
                    type="submit" 
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : t('send')}
                  </motion.button>
                </div>
              </form>
            </motion.div>

            {/* Contact Information */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('contactInfo')}</h2>
                <div className="space-y-4">
                  <motion.div 
                    className="flex items-start space-x-4"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-map-marker-alt text-xl text-green-600"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Address</h3>
                      <p className="text-gray-600">
                        3/179A, Malaipalayam<br />
                        Thonguttipalayam, Tiruppur<br />
                        Tamil Nadu, India 641665
                      </p>
                    </div>
                  </motion.div>
                  <motion.div 
                    className="flex items-start space-x-4"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-phone text-xl text-green-600"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Phone</h3>
                      <p className="text-gray-600">
                        +91 7548871552<br />
                        +91 9080064833
                      </p>
                    </div>
                  </motion.div>
                  <motion.div 
                    className="flex items-start space-x-4"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-envelope text-xl text-green-600"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Email</h3>
                      <p className="text-gray-600">
                        skdharaneesh6@gmail.com<br />
                        skdhara2222@gmail.com
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Business Hours */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('businessHours')}</h2>
                <div className="space-y-2">
                  <motion.div 
                    className="flex justify-between p-3 rounded-lg hover:bg-green-50 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-gray-600">Monday - Friday</span>
                    <span className="text-gray-800 font-medium">9:00 AM - 6:00 PM</span>
                  </motion.div>
                  <motion.div 
                    className="flex justify-between p-3 rounded-lg hover:bg-green-50 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-gray-600">Saturday</span>
                    <span className="text-gray-800 font-medium">10:00 AM - 4:00 PM</span>
                  </motion.div>
                  <motion.div 
                    className="flex justify-between p-3 rounded-lg hover:bg-green-50 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-gray-600">Sunday</span>
                    <span className="text-gray-800 font-medium">Closed</span>
                  </motion.div>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('connectWithUs')}</h2>
                <div className="flex space-x-4">
                  <motion.a 
                    href="#" 
                    className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                    whileHover={{ y: -5, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <i className="fab fa-facebook-f text-xl text-green-600"></i>
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                    whileHover={{ y: -5, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <i className="fab fa-twitter text-xl text-green-600"></i>
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                    whileHover={{ y: -5, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <i className="fab fa-instagram text-xl text-green-600"></i>
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                    whileHover={{ y: -5, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <i className="fab fa-linkedin-in text-xl text-green-600"></i>
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
