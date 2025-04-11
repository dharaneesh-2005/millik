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
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.mailersend.net';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || 'MS_fJUavy@test-z0vklo6e2mvl7qrx.mlsender.net';
const EMAIL_PASS = process.env.EMAIL_PASS || 'mssp.O8cbPAj.3vz9dle7qr74kj50.d4n6FCj';
const EMAIL_FROM = process.env.EMAIL_FROM || 'orders@millikit.com';
const STORE_NAME = process.env.STORE_NAME || 'Millikit';
const STORE_LOGO = process.env.STORE_LOGO || 'https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png';
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
    const fromName = process.env.EMAIL_FROM_NAME || 'MILLIKIT';
    const info = await transporter.sendMail({
      from: `"${fromName}" <${EMAIL_FROM}>`,
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
    
    // Create HTML email template with improved design matching website theme
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${orderNumber}</title>
      </head>
      <body style="font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #4B5563; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #F9FAFB;">
        <!-- Header with logo -->
        <div style="text-align: center; margin-bottom: 20px; background-color: #FFFFFF; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <img src="${STORE_LOGO}" alt="${STORE_NAME}" style="max-width: 180px;">
          <h1 style="margin: 20px 0 10px; color: #065F46; font-weight: 600; font-size: 28px;">Order Confirmation</h1>
          <p style="margin: 0; color: #6B7280; font-size: 16px;">Thank you for shopping with us!</p>
        </div>
        
        <!-- Order Info Card -->
        <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <p style="margin-bottom: 20px; font-size: 17px;">Dear Customer,</p>
          <p style="margin-bottom: 25px; font-size: 16px; color: #4B5563;">Thank you for your order! We're pleased to confirm that your order has been received and is being processed. Your premium millet products will be on their way to you soon.</p>
          
          <!-- Order Summary Box -->
          <div style="background-color: #F0FDF4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #065F46; font-weight: 600; font-size: 18px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Order Number:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Order Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${new Date(order.createdAt || new Date()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Order Status:</strong></td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background-color: ${
                    status === 'pending' ? '#FEF3C7' : 
                    status === 'processing' ? '#DBEAFE' : 
                    status === 'completed' ? '#D1FAE5' : 
                    status === 'failed' ? '#FEE2E2' : 
                    status === 'cancelled' ? '#E5E7EB' : '#f9f9f9'
                  }; padding: 6px 12px; border-radius: 20px; font-size: 14px; color: ${
                    status === 'pending' ? '#92400E' : 
                    status === 'processing' ? '#1E40AF' : 
                    status === 'completed' ? '#065F46' : 
                    status === 'failed' ? '#B91C1C' : 
                    status === 'cancelled' ? '#374151' : '#111827'
                  }; font-weight: 600;">${status.toUpperCase()}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Payment Method:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${
                  paymentMethod === 'razorpay' ? 'Razorpay' :
                  paymentMethod === 'phonepay' ? 'PhonePe' : 
                  paymentMethod === 'cod' ? 'Cash on Delivery' : 
                  paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
                  paymentMethod
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Payment Status:</strong></td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background-color: ${
                    (paymentStatus || 'pending') === 'pending' ? '#FEF3C7' : 
                    (paymentStatus || 'pending') === 'completed' ? '#D1FAE5' : 
                    (paymentStatus || 'pending') === 'failed' ? '#FEE2E2' : '#f9f9f9'
                  }; padding: 6px 12px; border-radius: 20px; font-size: 14px; color: ${
                    (paymentStatus || 'pending') === 'pending' ? '#92400E' : 
                    (paymentStatus || 'pending') === 'completed' ? '#065F46' : 
                    (paymentStatus || 'pending') === 'failed' ? '#B91C1C' : '#111827'
                  }; font-weight: 600;">${(paymentStatus || 'pending').toUpperCase()}</span>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Track order button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/orders/track?email=${encodeURIComponent(email)}&orderNumber=${encodeURIComponent(orderNumber)}" 
              style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 30px; 
              border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Track Your Order
            </a>
          </div>
        </div>
        
        <!-- Order Details Section -->
        <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <h2 style="margin-top: 0; color: #065F46; font-weight: 600; font-size: 22px; margin-bottom: 20px; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px;">Order Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #F3F4F6;">
                <th style="padding: 12px; text-align: left; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">Product</th>
                <th style="padding: 12px; text-align: center;">Quantity</th>
                <th style="padding: 12px; text-align: right;">Price</th>
                <th style="padding: 12px; text-align: right; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                const imageUrl = product?.imageUrl || '';
                
                return `
                  <tr>
                    <td style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB;">
                      <div style="display: flex; align-items: center;">
                        <img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                        <div>
                          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${item.name}</div>
                          ${item.weight ? `<div style="color: #6B7280; font-size: 14px;">Weight: ${item.weight}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #4B5563;">${item.quantity}</td>
                    <td style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #4B5563;">₹${parseFloat(item.price.toString()).toFixed(2)}</td>
                    <td style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600; color: #111827;">₹${parseFloat(item.subtotal.toString()).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 16px 12px; text-align: right; color: #4B5563;"><strong>Subtotal:</strong></td>
                <td style="padding: 16px 12px; text-align: right; color: #4B5563;">₹${parseFloat(subtotalAmount.toString()).toFixed(2)}</td>
              </tr>
              ${(discountAmount && parseFloat(discountAmount.toString()) > 0) ? `
              <tr>
                <td colspan="3" style="padding: 16px 12px; text-align: right; color: #4B5563;"><strong>Discount:</strong></td>
                <td style="padding: 16px 12px; text-align: right; color: #DC2626;">-₹${parseFloat(discountAmount.toString()).toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td colspan="3" style="padding: 16px 12px; text-align: right; color: #4B5563;"><strong>Shipping:</strong></td>
                <td style="padding: 16px 12px; text-align: right; color: #4B5563;">₹${parseFloat(shippingAmount.toString()).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 16px 12px; text-align: right; color: #4B5563;"><strong>Tax:</strong></td>
                <td style="padding: 16px 12px; text-align: right; color: #4B5563;">₹${parseFloat(taxAmount.toString()).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 16px 12px; text-align: right; color: #111827; font-weight: 600; font-size: 18px;"><strong>Total:</strong></td>
                <td style="padding: 16px 12px; text-align: right; font-size: 18px; color: #059669; font-weight: 700;">₹${parseFloat(totalAmount.toString()).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <!-- Shipping Information -->
        <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <h2 style="margin-top: 0; color: #065F46; font-weight: 600; font-size: 22px; margin-bottom: 15px;">Shipping Information</h2>
          <div style="background-color: #F9FAFB; border-radius: 8px; padding: 15px; border: 1px solid #E5E7EB;">
            <p style="margin: 5px 0; color: #4B5563;">${order.shippingAddress}</p>
          </div>
        </div>
        
        <!-- Help and Support -->
        <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <h2 style="margin-top: 0; color: #065F46; font-weight: 600; font-size: 22px; margin-bottom: 15px;">Need Help?</h2>
          <p style="color: #4B5563; margin-bottom: 15px;">If you have any questions about your order, please contact our customer service:</p>
          
          <div style="display: flex; margin-bottom: 20px;">
            <div style="flex: 1; padding: 15px; text-align: center; background-color: #F0FDF4; border-radius: 8px; margin-right: 10px;">
              <div style="font-weight: 600; color: #065F46; margin-bottom: 8px;">Email Support</div>
              <a href="mailto:support@millikit.com" style="color: #059669; text-decoration: none; font-weight: 500;">support@millikit.com</a>
            </div>
            <div style="flex: 1; padding: 15px; text-align: center; background-color: #F0FDF4; border-radius: 8px;">
              <div style="font-weight: 600; color: #065F46; margin-bottom: 8px;">Phone Support</div>
              <a href="tel:+91 7548871552" style="color: #059669; text-decoration: none; font-weight: 500;">+91 8xxx9xxx9</a>
            </div>
          </div>
          
          <p style="color: #4B5563; text-align: center;">Visit our website at <a href="${millik-1.onrender.com}" style="color: #059669; text-decoration: none; font-weight: 500;">${millik-1.onrender.com}</a> to track your order status.</p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 14px;">
          <p style="margin-bottom: 10px;">&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          <p style="margin-bottom: 20px;">Premium Millet Products for a Healthier Lifestyle</p>
          <div style="margin-bottom: 20px;">
            <a href="${BASE_URL}" style="color: #059669; text-decoration: none; margin: 0 10px;">Home</a>
            <a href="${BASE_URL}/products" style="color: #059669; text-decoration: none; margin: 0 10px;">Products</a>
            <a href="${BASE_URL}/about" style="color: #059669; text-decoration: none; margin: 0 10px;">About Us</a>
            <a href="${BASE_URL}/contact" style="color: #059669; text-decoration: none; margin: 0 10px;">Contact</a>
          </div>
          <p style="color: #9CA3AF; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
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
