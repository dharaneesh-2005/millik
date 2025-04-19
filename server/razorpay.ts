import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import Razorpay from 'razorpay';

// Load environment variables
try {
  if (fs.existsSync('.env') && !process.env.RAZORPAY_KEY_ID) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.error('Error loading .env file:', error instanceof Error ? error.message : String(error));
}

// Razorpay configuration
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Log a warning if the keys aren't set
if (!KEY_ID || !KEY_SECRET) {
  console.warn('Razorpay API keys not found in environment variables!');
}

// Define Razorpay order response types
interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET
});

// Generate unique transaction ID
export const generateTransactionId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `MILL${timestamp}${random}`;
};

// Generate order number
export const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${timestamp}${random}`;
};

// Create a Razorpay order
export const createRazorpayOrder = async (amount: number, orderNumber: string, currency: string = 'INR') => {
  try {
    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency,
      receipt: orderNumber,
      payment_capture: 1, // Auto capture payment
      notes: {
        orderNumber
      }
    };

    const order = await razorpayInstance.orders.create(options) as RazorpayOrderResponse;
    
    console.log('Razorpay order created:', order);
    
    return {
      success: true,
      orderId: order.id,
      amount: order.amount / 100, // Convert back to rupees for display
      currency: order.currency,
      receipt: order.receipt
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Verify Razorpay payment signature
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
) => {
  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === signature;
    
    return { 
      success: isValid,
      message: isValid ? 'Signature verified' : 'Invalid signature'
    };
  } catch (error) {
    console.error('Error verifying payment signature:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Get payment details by ID
export const getPaymentById = async (paymentId: string) => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return {
      success: true,
      payment
    };
  } catch (error) {
    console.error('Error fetching payment details:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Refund a payment
export const refundPayment = async (paymentId: string, amount?: number) => {
  try {
    // If amount is not provided, it will refund the full amount
    const options = amount ? { amount: Math.round(amount * 100) } : {};
    
    const refund = await razorpayInstance.payments.refund(paymentId, options);
    
    return {
      success: true,
      refund
    };
  } catch (error) {
    console.error('Error processing refund:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}; 