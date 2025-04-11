import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { calculateCartSummary } from "@/lib/cart";
import { Link } from "wouter";
import { CartItem, Product } from "@shared/schema";

// Form validation schema
const checkoutSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
  address: z.string().min(5, { message: "Address is required and must be at least 5 characters" }),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  postalCode: z.string().min(6, { message: "Postal code is required" }),
  country: z.string().min(1, { message: "Country is required" }),
  paymentMethod: z.enum(["razorpay"], {
    errorMap: () => ({ message: "Please select a payment method" }),
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// Declare Razorpay as a global type
declare global {
  interface Window {
    Razorpay: typeof Razorpay;
  }
}

export default function Checkout() {
  const { t } = useTranslation();
  const { cartItems, clearCart, isLoading: cartLoading } = useCart();
  const [, navigate] = useLocation();
  const [, params] = useRoute('/checkout:rest*');
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<(CartItem & { product?: Product }) | null>(null);
  
  // Calculate the total based on cart or buy now item
  const { subtotal, shipping, tax, total } = isBuyNow && buyNowItem 
    ? calculateCartSummary([buyNowItem]) 
    : calculateCartSummary(cartItems);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "razorpay",
    }
  });
  
  // Set page title and handle buy now mode
  useEffect(() => {
    document.title = `${isBuyNow ? t('directCheckout') : t('checkout')} - Millikit`;
    
    // Check if we're in buy now mode
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    setIsBuyNow(mode === 'buynow');
    
    // If buy now mode, get the item from session storage
    if (mode === 'buynow') {
      const buyNowItemJson = sessionStorage.getItem('buyNowItem');
      if (buyNowItemJson) {
        try {
          const parsedItem = JSON.parse(buyNowItemJson);
          setBuyNowItem(parsedItem);
          console.log('Loaded buy now item:', parsedItem);
        } catch (error) {
          console.error('Error parsing buy now item:', error);
          toast({
            title: "Error",
            description: "Could not process direct checkout item.",
            variant: "destructive",
          });
          navigate("/products");
        }
      } else {
        // No buy now item found, redirect to products
        toast({
          title: "Error",
          description: "No product information found for direct checkout.",
          variant: "destructive",
        });
        navigate("/products");
      }
    }
    
    // Get or generate session ID
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('sessionId', newSessionId);
      setSessionId(newSessionId);
    }
    
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [t, navigate, toast, isBuyNow]);
  
  // Redirect to products if cart is empty and not in buy now mode
  useEffect(() => {
    if (!cartLoading && cartItems.length === 0 && !isBuyNow) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Please add some products before checkout.",
        variant: "destructive",
      });
      navigate("/products");
    }
  }, [cartItems, cartLoading, navigate, toast, isBuyNow]);
  
  // Format phone number to +91 format
  const formatPhoneForSubmission = (phone: string) => {
    // Clean the phone number to only contain digits
    const cleaned = phone.replace(/\D/g, '');
    
    // If already has a country code
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned; // Return as is
    }
    
    // For 10-digit Indian numbers, add +91
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    
    // Return the cleaned number
    return cleaned;
  };

  const handleRazorpayPayment = async (formData: CheckoutFormValues) => {
    try {
      setIsProcessing(true);
      
      // Format the phone number
      const formattedPhone = formatPhoneForSubmission(formData.phone);
      
      console.log('Processing payment with data:', {
        amount: total,
        email: formData.email,
        phone: formattedPhone,
      });

      // Prepare the items array based on whether we're in buy now mode or regular checkout
      const checkoutItems = isBuyNow && buyNowItem 
        ? [{ 
            productId: buyNowItem.productId, 
            quantity: buyNowItem.quantity, 
            metaData: buyNowItem.metaData || JSON.stringify({}) 
          }] 
        : cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            metaData: item.metaData || JSON.stringify({})
          }));

      // Create an order in our backend
      const createOrderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Id': sessionId || 'unknown-session'
        },
        body: JSON.stringify({
          amount: total,
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formattedPhone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
          items: checkoutItems
        })
      });
      
      if (!createOrderResponse.ok) {
        const errorData = await createOrderResponse.json();
        throw new Error(errorData.message || 'Failed to create order');
      }
      
      const orderData = await createOrderResponse.json();
      console.log('Order created successfully:', orderData);
      
      if (!orderData.success || !orderData.orderId) {
        throw new Error('Invalid order data received from server');
      }
      
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
      }
      
      // Create Razorpay payment options
      let rzpOptions = {
        key: 'rzp_test_ICFzlzJpqAvLWl',
        amount: Math.round(total * 100), // convert to paisa
        currency: 'INR',
        name: 'Millikit',
        description: `Order #${orderData.orderNumber}`,
        order_id: orderData.orderId,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formattedPhone
        },
        notes: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
          orderNumber: orderData.orderNumber
        },
        theme: {
          color: '#4CAF50'
        },
        handler: async function(response: any) {
          // Payment successful, verify the payment
          console.log('Payment successful response:', response);
          
          try {
            // Verify the payment with our backend
            const verifyResponse = await fetch('/api/orders/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              })
            });
            
            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.message || 'Payment verification failed');
            }
            
            // If payment is successful and verified, clear session storage if in buy now mode
            if (isBuyNow) {
              sessionStorage.removeItem('buyNowItem');
            } else {
              // Only clear the cart if it's a regular checkout
              await clearCart();
            }
            
            toast({
              title: "Payment Successful",
              description: `Your order #${orderData.orderNumber} has been placed successfully.`,
            });
            navigate(`/order-success?orderNumber=${orderData.orderNumber}`);
          } catch (error) {
            console.error('Error handling payment success:', error);
            toast({
              title: "Error Processing Payment",
              description: error instanceof Error ? error.message : "An error occurred",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "You have cancelled the payment. Your order has not been placed.",
              variant: "destructive",
            });
          }
        }
      };
      
      // Initialize and open Razorpay
      let rzp = new window.Razorpay(rzpOptions);
      rzp.open();
      
    } catch (error) {
      console.error("Error processing order:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : t('errorOccurred'),
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };
  
  const onSubmit = async (data: CheckoutFormValues) => {
    await handleRazorpayPayment(data);
  };
  
  if (cartLoading) {
    return (
      <div className="pt-28 flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }
  
  return (
    <>
      {/* Checkout Header */}
      <section className="pt-28 pb-8 bg-white">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {isBuyNow ? t('directCheckout') : t('checkout')}
          </h1>
          
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-green-600 transition-colors">
              {t('home')}
            </Link>
            <span className="text-gray-400">/</span>
            
            {isBuyNow && buyNowItem ? (
              <>
                <Link href="/products" className="text-gray-500 hover:text-green-600 transition-colors">
                  {t('products')}
                </Link>
                <span className="text-gray-400">/</span>
                <Link href={`/products/${buyNowItem.product?.slug || '#'}`} className="text-gray-500 hover:text-green-600 transition-colors">
                  {buyNowItem.product?.name || t('product')}
                </Link>
              </>
            ) : (
              <Link href="/cart" className="text-gray-500 hover:text-green-600 transition-colors">
                {t('cart')}
              </Link>
            )}
            
            <span className="text-gray-400">/</span>
            <span className="text-green-600">{isBuyNow ? t('directCheckout') : t('checkout')}</span>
          </div>
        </div>
      </section>
      
      {/* Checkout Content */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Billing & Shipping Details */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {t('billingDetails')}
                    </h2>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="firstName">
                        {t('firstName')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="firstName" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.firstName ? 'border-red-500' : ''}`}
                        {...register("firstName")}
                      />
                      {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="lastName">
                        {t('lastName')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="lastName" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.lastName ? 'border-red-500' : ''}`}
                        {...register("lastName")}
                      />
                      {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="email">
                        {t('email')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="email" 
                        id="email" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.email ? 'border-red-500' : ''}`}
                        {...register("email")}
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="phone">
                        {t('phone')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="tel" 
                        id="phone" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.phone ? 'border-red-500' : ''}`}
                        {...register("phone")}
                      />
                      {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2" htmlFor="address">
                        {t('address')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="address" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.address ? 'border-red-500' : ''}`}
                        {...register("address")}
                      />
                      {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="city">
                        {t('city')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="city" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.city ? 'border-red-500' : ''}`}
                        {...register("city")}
                      />
                      {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="state">
                        {t('state')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="state" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.state ? 'border-red-500' : ''}`}
                        {...register("state")}
                      />
                      {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="postalCode">
                        {t('postalCode')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="postalCode" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.postalCode ? 'border-red-500' : ''}`}
                        {...register("postalCode")}
                      />
                      {errors.postalCode && <p className="mt-1 text-sm text-red-500">{errors.postalCode.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2" htmlFor="country">
                        {t('country')} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="country" 
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none form-input ${errors.country ? 'border-red-500' : ''}`}
                        {...register("country")}
                      />
                      {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country.message}</p>}
                    </div>
                  </div>
                </div>
                
                {/* Payment Method */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {t('paymentMethod')}
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-6">
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="razorpay" 
                            value="razorpay" 
                            className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                            {...register("paymentMethod")}
                            checked
                            readOnly
                          />
                          <label htmlFor="razorpay" className="ml-2 text-gray-700">
                            Razorpay (Credit/Debit Card, UPI, NetBanking, etc.) <i className="fas fa-credit-card ml-2 text-gray-500"></i>
                          </label>
                        </div>
                      </div>
                      {errors.paymentMethod && <p className="mt-2 text-sm text-red-500">{errors.paymentMethod.message}</p>}
                    </div>
                    
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-gray-600">You will be redirected to Razorpay's secure payment gateway to complete your purchase.</p>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3">
                        {/* Razorpay */}
                        <div className="bg-slate-800 text-white px-2 py-1 rounded text-sm font-bold">
                          Razorpay
                        </div>
                        
                        {/* Visa */}
                        <div className="bg-white border border-gray-200 px-1 rounded">
                          <svg className="h-6" viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.6664 1.21899L14.4383 14.2024H11.4953L6.32345 3.3455C6.11065 2.81761 5.9483 2.50339 5.63408 2.31098C5.08486 1.95583 4.21387 1.62099 3.45324 1.4312L3.50371 1.2172H8.44874C9.10527 1.2172 9.70402 1.60273 9.88903 2.33137L12.5345 10.1599L15.8318 1.21899H19.6664Z" fill="#3C58BF"/>
                            <path d="M19.6664 1.21899L14.4383 14.2024H11.4953L6.32345 3.3455C6.11065 2.81761 5.9483 2.50339 5.63408 2.31098C5.08486 1.95583 4.21387 1.62099 3.45324 1.4312L3.50371 1.2172H8.44874C9.10527 1.2172 9.70402 1.60273 9.88903 2.33137L12.5345 10.1599L15.8318 1.21899H19.6664Z" fill="#293688"/>
                            <path d="M32.2575 9.42957C32.2791 7.56699 30.9355 6.10745 28.733 6.10745C26.5088 6.10745 25.165 7.56699 25.165 9.42957C25.165 11.4701 26.7247 12.7528 29.0686 12.7528C30.0991 12.7528 30.9701 12.5366 31.6269 12.19L31.2175 10.1599C30.6467 10.3977 29.9687 10.5569 29.1514 10.5569C28.0704 10.5569 27.3177 10.0865 27.2744 9.34629H32.2359C32.2359 9.34629 32.2575 9.29622 32.2575 9.42957Z" fill="#3C58BF"/>
                            <path d="M32.2575 9.42957C32.2791 7.56699 30.9355 6.10745 28.733 6.10745C26.5088 6.10745 25.165 7.56699 25.165 9.42957C25.165 11.4701 26.7247 12.7528 29.0686 12.7528C30.0991 12.7528 30.9701 12.5366 31.6269 12.19L31.2175 10.1599C30.6467 10.3977 29.9687 10.5569 29.1514 10.5569C28.0704 10.5569 27.3177 10.0865 27.2744 9.34629H32.2359C32.2359 9.34629 32.2575 9.29622 32.2575 9.42957Z" fill="#293688"/>
                            <path d="M23.4375 12.5365L26.9989 6.32104L24.1526 6.32065C23.2744 8.34813 22.3394 10.355 22.0252 11.0877L21.9316 6.32104H18.9886L19.0741 14.2036H22.0172C22.0172 13.4302 22.0987 12.1475 23.4375 12.5365Z" fill="#3C58BF"/>
                            <path d="M23.4375 12.5365L26.9989 6.32104L24.1526 6.32065C23.2744 8.34813 22.3394 10.355 22.0252 11.0877L21.9316 6.32104H18.9886L19.0741 14.2036H22.0172C22.0172 13.4302 22.0987 12.1475 23.4375 12.5365Z" fill="#293688"/>
                            <path d="M41.3585 6.32104H38.9371C38.534 6.32104 38.1993 6.53384 38.0616 6.91977L34.6512 14.2036H37.5942L38.1037 12.7224H41.0471L41.3369 14.2036H44.0609L41.3585 6.32104ZM38.6868 10.645L39.7864 7.54736L40.3959 10.645H38.6868Z" fill="#3C58BF"/>
                            <path d="M41.3585 6.32104H38.9371C38.534 6.32104 38.1993 6.53384 38.0616 6.91977L34.6512 14.2036H37.5942L38.1037 12.7224H41.0471L41.3369 14.2036H44.0609L41.3585 6.32104ZM38.6868 10.645L39.7864 7.54736L40.3959 10.645H38.6868Z" fill="#293688"/>
                          </svg>
                        </div>
                        
                        {/* Mastercard */}
                        <div className="bg-white border border-gray-200 px-1 rounded">
                          <svg className="h-6" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24.5858 3.48H15.4143V20.52H24.5858V3.48Z" fill="#FF5F00"/>
                            <path d="M16.1485 12C16.1471 10.1205 16.6224 8.27352 17.5291 6.63634C18.4358 4.99916 19.7421 3.62455 21.3143 2.664C19.3938 1.11998 17.0422 0.23082 14.5983 0.150025C12.1544 0.0692301 9.74684 0.801187 7.71884 2.25C5.69084 3.69882 4.15684 5.79594 3.3471 8.20235C2.53736 10.6088 2.49419 13.2147 3.22302 15.6495C3.95184 18.0844 5.41535 20.2346 7.39518 21.7534C9.37501 23.2721 11.7607 24.0911 14.2069 24.0001C16.653 23.909 19.0001 22.9124 20.9001 21.348C19.3328 20.3831 18.0337 19.0084 17.1321 17.3732C16.2306 15.738 15.7567 13.8943 15.7572 12H16.1485Z" fill="#EB001B"/>
                            <path d="M36.7715 12C36.7721 14.4197 35.9844 16.7799 34.5064 18.7198C33.0283 20.6596 30.9428 22.0747 28.5716 22.7441C26.2004 23.4135 23.6703 23.2987 21.3687 22.4176C19.0671 21.5366 17.1293 19.9389 15.8572 17.8571C17.4258 16.8902 18.723 15.5157 19.6246 13.881C20.5262 12.2463 21.001 10.4028 21.0015 8.50857C21.002 6.61433 20.5281 4.77071 19.6273 3.13566C18.7265 1.50061 17.4298 0.125548 15.8615 0.158571C18.2306 -0.512929 20.76 -0.399371 23.0619 0.479588C25.3638 1.35855 27.3024 2.95385 28.5763 5.03335C29.8502 7.11286 30.6389 9.47211 30.64 11.892C30.6412 11.928 30.6412 11.964 30.64 12H36.7715Z" fill="#F79E1B"/>
                          </svg>
                        </div>
                        
                        {/* RuPay */}
                        <div className="bg-white border border-gray-200 px-1 rounded">
                          <svg className="h-6" viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.2932 0.0541992H2.93616C1.31514 0.0541992 0 1.36934 0 2.99036V13.0028C0 14.6238 1.31514 15.939 2.93616 15.939H14.2932C15.9142 15.939 17.2294 14.6238 17.2294 13.0028V2.99036C17.2294 1.36934 15.9142 0.0541992 14.2932 0.0541992Z" fill="#23326D"/>
                            <path d="M44.6927 0.0541992H26.8157C25.8344 0.0541992 25.0371 0.851416 25.0371 1.83274V14.1604C25.0371 15.1417 25.8344 15.939 26.8157 15.939H44.6927C45.674 15.939 46.4713 15.1417 46.4713 14.1604V1.83274C46.4713 0.851416 45.674 0.0541992 44.6927 0.0541992Z" fill="#14A74C"/>
                            <path d="M3.48273 6.34351H5.20129C5.89953 6.34351 6.33881 6.7828 6.33881 7.44273C6.33881 8.06435 5.89953 8.54194 5.20129 8.54194H3.48273V6.34351ZM2.32263 5.34351V11.6468H3.48273V9.52873H5.20129C6.581 9.52873 7.49888 8.59803 7.49888 7.44273C7.49888 6.27432 6.581 5.34351 5.20129 5.34351H2.32263Z" fill="white"/>
                            <path d="M7.91003 5.34375H9.09351V9.49608H11.7986V11.647H7.91003V5.34375Z" fill="white"/>
                            <path d="M11.6667 5.34375H14.1174C15.4971 5.34375 16.415 6.26175 16.415 7.50041C16.415 8.73895 15.4971 9.65707 14.1174 9.65707H12.8503V11.647H11.6667V5.34375ZM12.8503 6.33041V8.65694H14.1174C14.8156 8.65694 15.255 8.1989 15.255 7.50041C15.255 6.80191 14.8156 6.33041 14.1174 6.33041H12.8503Z" fill="white"/>
                            <path d="M27.6118 5.34375H28.8105V9.50036H31.9066V11.647H27.6118V5.34375Z" fill="white"/>
                            <path d="M32.2656 5.34375H33.4491V11.647H32.2656V5.34375Z" fill="white"/>
                            <path d="M34.2959 5.34375H35.4091L38.3894 9.25719V5.34375H39.5882V11.647H38.5706L35.4795 7.50364V11.647H34.2959V5.34375Z" fill="white"/>
                            <path d="M42.8516 10.4033L43.3701 9.36365C44.0078 9.78889 44.6455 10.0026 45.3 10.0026C45.9378 10.0026 46.3326 9.7434 46.3326 9.34193C46.3326 8.97624 46.0733 8.75742 45.2301 8.59028C44.0837 8.36841 43.2152 7.9821 43.2152 6.95627C43.2152 6.00909 44.0078 5.25458 45.3 5.25458C46.0582 5.25458 46.8306 5.46058 47.4682 5.8458L46.9649 6.91458C46.3326 6.53603 45.7917 6.37167 45.2884 6.37167C44.6658 6.37167 44.2989 6.61913 44.2989 6.97078C44.2989 7.32361 44.5733 7.55717 45.3908 7.72452C46.6474 7.97468 47.4682 8.37603 47.4682 9.40521C47.4682 10.3676 46.6452 11.1069 45.3153 11.1069C44.4375 11.1069 43.5294 10.8313 42.8516 10.4033Z" fill="white"/>
                            <path d="M21.1882 5.34375H22.2815L24.4048 11.647H23.1942L22.7237 10.1706H20.7155L20.2299 11.647H19.0312L21.1882 5.34375ZM22.4504 9.19354L21.7196 6.83254L20.9737 9.19354H22.4504Z" fill="url(#paint0_linear_121_5)"/>
                            <defs>
                              <linearGradient id="paint0_linear_121_5" x1="19.0312" y1="8.49536" x2="24.4048" y2="8.49536" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#ED1C24"/>
                                <stop offset="1" stopColor="#FCEE21"/>
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        
                        {/* UPI */}
                        <div className="bg-white border border-gray-200 px-2 py-1 rounded">
                          <span className="text-sm font-bold text-blue-600">UPI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Order Summary */}
              <div>
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    {isBuyNow ? t('orderSummary') : `${t('cart')} ${t('summary')}`}
                  </h2>
                  
                  {/* Order items */}
                  <div className="mb-6 max-h-64 overflow-y-auto">
                    <ul className="divide-y">
                      {isBuyNow && buyNowItem ? (
                        <li key={buyNowItem.productId} className="py-3 flex items-center gap-3">
                          <div className="w-16 h-16">
                            <img 
                              src={buyNowItem.product?.imageUrl} 
                              alt={buyNowItem.product?.name} 
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>
                          <div className="flex-grow">
                            <h4 className="text-sm font-medium text-gray-800">
                              {buyNowItem.product?.name}
                              {buyNowItem.metaData && (
                                <span className="text-xs text-gray-500 ml-1">
                                  {(() => {
                                    try {
                                      const meta = JSON.parse(buyNowItem.metaData);
                                      return meta.selectedWeight ? ` - ${meta.selectedWeight}` : '';
                                    } catch (e) {
                                      return '';
                                    }
                                  })()}
                                </span>
                              )}
                            </h4>
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>{buyNowItem.quantity} x ₹{buyNowItem.product?.price}</span>
                              <span>₹{(parseFloat(buyNowItem.product?.price || "0") * buyNowItem.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                        </li>
                      ) : (
                        cartItems.map(item => (
                          <li key={item.id} className="py-3 flex items-center gap-3">
                            <div className="w-16 h-16">
                              <img 
                                src={item.product?.imageUrl} 
                                alt={item.product?.name} 
                                className="w-full h-full object-cover rounded-md"
                              />
                            </div>
                            <div className="flex-grow">
                              <h4 className="text-sm font-medium text-gray-800">
                                {item.product?.name}
                              </h4>
                              <div className="flex justify-between text-sm text-gray-500">
                                <span>{item.quantity} x ₹{item.product?.price}</span>
                                <span>₹{(parseFloat(item.product?.price || "0") * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  
                  {/* Order total */}
                  <div className="space-y-4">
                    <div className="flex justify-between border-b pb-4">
                      <span className="text-gray-600">{t('subtotal')}</span>
                      <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-4">
                      <span className="text-gray-600">{t('shipping')}</span>
                      <span className="font-medium">₹{shipping.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-4">
                      <span className="text-gray-600">{t('tax')}</span>
                      <span className="font-medium">₹{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pb-4">
                      <span className="text-gray-800 font-semibold">{t('total')}</span>
                      <span className="text-green-600 font-bold text-xl">₹{total.toFixed(2)}</span>
                    </div>
                    
                    <button 
                      type="submit" 
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : t('proceedToPayment')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
