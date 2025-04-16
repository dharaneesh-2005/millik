import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/contexts/LanguageContext";

export default function OrderSuccess() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  
  useEffect(() => {
    // Set page title
    document.title = `${t('orderSuccess')} - Millikit`;
    
    // Extract order number from URL
    const params = new URLSearchParams(window.location.search);
    const orderNum = params.get('orderNumber');
    
    if (orderNum) {
      setOrderNumber(orderNum);
    } else {
      // Fallback if no order number provided
      setOrderNumber("ORD" + Date.now().toString().substring(5));
    }
  }, [t]);
  
  return (
    <div className="pt-28 pb-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('thankYou')}</h1>
            <p className="text-lg text-gray-600">{t('orderPlacedSuccessfully')}</p>
            
            {orderNumber && (
              <div className="mt-6 mb-8">
                <p className="text-gray-600">{t('orderNumber')}:</p>
                <p className="text-xl font-semibold text-gray-800 mt-1">#{orderNumber}</p>
              </div>
            )}
            
            <div className="text-gray-600 border-t border-b py-6 my-6">
              <p>{t('orderConfirmationEmailSent')}</p>
              <p className="mt-2">{t('checkSpamFolder')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Link href="/products" className="inline-flex items-center justify-center px-6 py-3 bg-white border border-green-600 text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('continueShopping')}
              </Link>
              
              <Link href="/" className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {t('backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 