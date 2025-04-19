import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import LogoLoader from "@/components/LogoLoader";
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
      
      // Debug: Check if Razorpay key is available in env
      console.log('Razorpay Key from ENV:', import.meta.env.VITE_RAZORPAY_KEY_ID);

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
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
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
        <LogoLoader size="large" text="Loading checkout..." />
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
                      <div className="mt-3">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-600 mb-2">Secured payment processing by Razorpay</p>
                          <div className="flex flex-wrap gap-2 items-center mt-2">
                            {/* Razorpay */}
                            <div className="bg-slate-800 text-white px-2 py-1 rounded text-sm font-medium">
                              Razorpay
                            </div>
                            
                            {/* Credit/Debit Cards */}
                            <div className="bg-blue-50 border border-blue-200 px-2 py-1 rounded text-sm font-medium text-blue-700">
                              Credit/Debit Cards
                            </div>
                            
                            {/* UPI */}
                            <div className="bg-green-50 border border-green-200 px-2 py-1 rounded text-sm font-medium text-green-700">
                              UPI
                            </div>
                            
                            {/* NetBanking */}
                            <div className="bg-purple-50 border border-purple-200 px-2 py-1 rounded text-sm font-medium text-purple-700">
                              NetBanking
                            </div>
                            
                            {/* Wallets */}
                            <div className="bg-orange-50 border border-orange-200 px-2 py-1 rounded text-sm font-medium text-orange-700">
                              Wallets
                            </div>
                          </div>
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
                          <div className="flex items-center">
                            <div className="relative w-5 h-5 mr-3">
                              <img 
                                src="/assets/LOGO-removebg-preview.png" 
                                alt="Loading" 
                                className="absolute inset-0 w-full h-full object-contain animate-flip"
                              />
                            </div>
                            Processing...
                          </div>
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
