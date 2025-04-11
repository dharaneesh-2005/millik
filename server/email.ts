import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Order, OrderItem, Product } from '@shared/schema';

// Load environment variables
try {
  if (fs.existsSync('.env') && !process.env.EMAIL_HOST) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.error('Error loading .env file:', error instanceof Error ? error.message : String(error));
}

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@millikit.com';
const STORE_NAME = process.env.STORE_NAME || 'Millikit';
const STORE_LOGO = process.env.STORE_LOGO || 'https://i.postimg.cc/8c7QrD35/Millikit-logo.png';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Send email
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"${STORE_NAME}" <${EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    
    console.log('Email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending email:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

// Generate order confirmation email
export const sendOrderConfirmationEmail = async (order: Order, orderItems: OrderItem[], products: Product[]) => {
  try {
    const { email, orderNumber, totalAmount, subtotalAmount, taxAmount, shippingAmount, discountAmount, paymentMethod, paymentStatus, status } = order;
    
    if (!email) {
      console.error('Cannot send order confirmation: Email is missing');
      return { success: false, error: 'Email is missing' };
    }
    
    // Create item rows for the order
    const itemsHtml = orderItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      const imageUrl = product?.imageUrl || '';
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <img src="${imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${item.name}</strong>
            ${item.weight ? `<br><span style="color: #777; font-size: 12px;">Weight: ${item.weight}</span>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${parseFloat(item.price.toString()).toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${parseFloat(item.subtotal.toString()).toFixed(2)}</td>
        </tr>
      `;
    }).join('');
    
    // Create HTML email template
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${orderNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${STORE_LOGO}" alt="${STORE_NAME}" style="max-width: 200px;">
        </div>
        
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h2 style="margin-top: 0; color: #4CAF50;">Order Confirmation</h2>
          <p>Dear Customer,</p>
          <p>Thank you for your order! We're pleased to confirm that your order has been received and is being processed.</p>
          
          <div style="background-color: #fff; border-radius: 4px; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50;">
            <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
            <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt || new Date()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin: 5px 0;"><strong>Order Status:</strong> <span style="background-color: ${
              status === 'pending' ? '#FFF59D' : 
              status === 'processing' ? '#BBDEFB' : 
              status === 'completed' ? '#C8E6C9' : 
              status === 'failed' ? '#FFCDD2' : 
              status === 'cancelled' ? '#CFD8DC' : '#f9f9f9'
            }; padding: 2px 8px; border-radius: 12px; font-size: 14px;">${status.toUpperCase()}</span></p>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${
              paymentMethod === 'phonepay' ? 'PhonePe' : 
              paymentMethod === 'cod' ? 'Cash on Delivery' : 
              paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
              paymentMethod
            }</p>
            <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="background-color: ${
              (paymentStatus || 'pending') === 'pending' ? '#FFF59D' : 
              (paymentStatus || 'pending') === 'completed' ? '#C8E6C9' : 
              (paymentStatus || 'pending') === 'failed' ? '#FFCDD2' : '#f9f9f9'
            }; padding: 2px 8px; border-radius: 12px; font-size: 14px;">${(paymentStatus || 'pending').toUpperCase()}</span></p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left;">Image</th>
                <th style="padding: 12px; text-align: left;">Product</th>
                <th style="padding: 12px; text-align: center;">Quantity</th>
                <th style="padding: 12px; text-align: right;">Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;"><strong>Subtotal:</strong></td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">₹${parseFloat(subtotalAmount.toString()).toFixed(2)}</td>
              </tr>
              ${(discountAmount && parseFloat(discountAmount.toString()) > 0) ? `
              <tr>
                <td colspan="4" style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;"><strong>Discount:</strong></td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color: #E53935;">-₹${parseFloat(discountAmount.toString()).toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td colspan="4" style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;"><strong>Shipping:</strong></td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">₹${parseFloat(shippingAmount.toString()).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;"><strong>Tax:</strong></td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">₹${parseFloat(taxAmount.toString()).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;"><strong>Total:</strong></td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; font-size: 18px; color: #4CAF50;"><strong>₹${parseFloat(totalAmount.toString()).toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h3 style="margin-top: 0;">Shipping Address</h3>
          <p style="margin: 5px 0;">${order.shippingAddress}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>If you have any questions about your order, please contact our customer service at <a href="mailto:support@millikit.com" style="color: #4CAF50; text-decoration: none;">support@millikit.com</a> or call us at <a href="tel:+918xxx9xxx9" style="color: #4CAF50; text-decoration: none;">+91 8xxx9xxx9</a>.</p>
          <p>You can also visit our website at <a href="${BASE_URL}" style="color: #4CAF50; text-decoration: none;">${BASE_URL}</a> to track your order status.</p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #777; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;
    
    return await sendEmail(email, `Your Order Confirmation #${orderNumber} - ${STORE_NAME}`, html);
  } catch (error) {
    console.error('Error generating order confirmation email:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}; 