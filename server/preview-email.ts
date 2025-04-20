import fs from 'fs';
import path from 'path';
import { 
  sendShippingNotificationEmail 
} from './email';
import { Order } from '@shared/schema';

// Create a sample order that matches the Order type from schema
const sampleOrder: Partial<Order> = {
  id: 999,
  orderNumber: 'ORD12345678',
  status: 'shipped',
  paymentStatus: 'paid',
  email: 'customer@example.com',
  phone: '+919876543210',
  paymentMethod: 'razorpay',
  totalAmount: 1299.00,
  subtotalAmount: 1199.00,
  shippingAmount: 100.00,
  taxAmount: 0,
  discountAmount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: null,
  paymentId: 'pay_123456789',
  sessionId: 'sess_123456789',
  trackingId: 'TRK12345678IN',
  transactionId: 'TRANS123456',
  shippingMethod: 'express',
  billingAddress: {},
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
    phoneNumber: '+919876543210'
  }
};

// Generate the email HTML and save it to a file
async function previewShippingEmail() {
  try {
    // Generate the email HTML
    const result = await sendShippingNotificationEmail(
      sampleOrder as Order,
      'TRK12345678IN' // Sample tracking ID
    );
    
    // If there was an error, console log it and exit
    if (!result.success) {
      console.error('Error generating email:', result.error);
      return;
    }
    
    // Check if HTML is in the result
    if (!result.html) {
      console.error('No HTML in result');
      return;
    }
    
    // Save the HTML to a file
    const filePath = path.join(__dirname, '../preview-shipping-email.html');
    fs.writeFileSync(filePath, result.html);
    
    console.log(`Email preview saved to ${filePath}`);
    console.log('Open this file in a browser to view the email template');
  } catch (error) {
    console.error('Error previewing email:', error);
  }
}

// Run the preview function
previewShippingEmail();