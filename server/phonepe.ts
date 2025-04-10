import crypto from 'crypto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
try {
  if (fs.existsSync('.env') && !process.env.PHONEPE_MERCHANT_ID) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.error('Error loading .env file:', error);
}

// PhonePe configuration
const PHONEPE_HOST = process.env.NODE_ENV === 'production' 
  ? 'https://api.phonepe.com/apis/hermes' 
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT'; // Default test merchant ID
const SALT_KEY = process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399'; // Default test salt key
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';

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

// Create PhonePe payment request
export const createPaymentRequest = async (amount: number, orderNumber: string, customerEmail: string, customerPhone: string, callbackUrl: string) => {
  try {
    const transactionId = generateTransactionId();
    
    // Create payload
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: `MUID${Date.now()}`,
      amount: amount * 100, // Amount in paise (multiply by 100)
      redirectUrl: `${callbackUrl}?transactionId=${transactionId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${callbackUrl}?transactionId=${transactionId}`,
      paymentInstrument: {
        type: 'PAY_PAGE'
      },
      merchantOrderId: orderNumber,
      mobileNumber: customerPhone,
      email: customerEmail
    };
    
    // Convert payload to base64
    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString('base64');
    
    // Generate SHA256 hash
    const string = payloadBase64 + '/pg/v1/pay' + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    
    const xVerify = sha256 + '###' + SALT_INDEX;
    
    // Make API request to PhonePe
    const response = await axios.post(
      `${PHONEPE_HOST}/pg/v1/pay`,
      {
        request: payloadBase64
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
        }
      }
    );
    
    console.log('PhonePe payment request response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
        transactionId,
        merchantOrderId: orderNumber
      };
    } else {
      console.error('PhonePe payment request failed:', response.data);
      return {
        success: false,
        error: response.data.message || 'Payment request failed',
        code: response.data.code,
        transactionId
      };
    }
  } catch (error) {
    console.error('Error creating PhonePe payment:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      transactionId: null
    };
  }
};

// Check payment status
export const checkPaymentStatus = async (transactionId: string) => {
  try {
    // Generate SHA256 hash
    const string = `/pg/v1/status/${MERCHANT_ID}/${transactionId}` + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    
    const xVerify = sha256 + '###' + SALT_INDEX;
    
    // Make API request to PhonePe
    const response = await axios.get(
      `${PHONEPE_HOST}/pg/v1/status/${MERCHANT_ID}/${transactionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
          'X-MERCHANT-ID': MERCHANT_ID
        }
      }
    );
    
    console.log('PhonePe payment status response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        status: response.data.data.paymentInstrument.status,
        amount: response.data.data.amount / 100, // Convert from paise to rupees
        transactionId,
        paymentId: response.data.data.transactionId,
        merchantOrderId: response.data.data.merchantOrderId
      };
    } else {
      console.error('PhonePe payment status check failed:', response.data);
      return {
        success: false,
        error: response.data.message || 'Payment status check failed',
        code: response.data.code,
        transactionId
      };
    }
  } catch (error) {
    console.error('Error checking PhonePe payment status:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      transactionId
    };
  }
};

// Refund a payment
export const refundPayment = async (transactionId: string, amount: number, reason: string) => {
  try {
    const refundId = `REFUND_${Date.now()}`;
    
    // Create payload
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantOrderId: refundId,
      amount: amount * 100, // Amount in paise
      reason
    };
    
    // Convert payload to base64
    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString('base64');
    
    // Generate SHA256 hash
    const string = payloadBase64 + '/pg/v1/refund' + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    
    const xVerify = sha256 + '###' + SALT_INDEX;
    
    // Make API request to PhonePe
    const response = await axios.post(
      `${PHONEPE_HOST}/pg/v1/refund`,
      {
        request: payloadBase64
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
        }
      }
    );
    
    console.log('PhonePe refund response:', response.data);
    
    if (response.data.success) {
      return {
        success: true,
        refundId: response.data.data.merchantRefundId,
        status: response.data.data.state,
        transactionId
      };
    } else {
      console.error('PhonePe refund failed:', response.data);
      return {
        success: false,
        error: response.data.message || 'Refund failed',
        code: response.data.code,
        transactionId
      };
    }
  } catch (error) {
    console.error('Error processing PhonePe refund:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      transactionId
    };
  }
}; 