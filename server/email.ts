import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { Order, OrderItem, Product } from "@shared/schema";

// Load environment variables
try {
  if (fs.existsSync(".env") && !process.env.EMAIL_HOST) {
    const envConfig = dotenv.parse(fs.readFileSync(".env"));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log("Loaded environment variables from .env file");
  }
} catch (error) {
  console.error(
    "Error loading .env file:",
    error instanceof Error ? error.message : String(error),
  );
}

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.mailersend.net";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER =
  process.env.EMAIL_USER || "MS_fJUavy@test-z0vklo6e2mvl7qrx.mlsender.net";
const EMAIL_PASS =
  process.env.EMAIL_PASS || "mssp.O8cbPAj.3vz9dle7qr74kj50.d4n6FCj";
const EMAIL_FROM = process.env.EMAIL_FROM || "orders@millikit.com";
const STORE_NAME = process.env.STORE_NAME || "Millikit";
const STORE_LOGO =
  process.env.STORE_LOGO ||
  "https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png";
const BASE_URL = process.env.BASE_URL || "https://millik-1.onrender.com";

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
    const fromName = process.env.EMAIL_FROM_NAME || "MILLIKIT";
    const info = await transporter.sendMail({
      from: `"${fromName}" <${EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(
      "Error sending email:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Generate order confirmation email
export const sendOrderConfirmationEmail = async (
  order: Order,
  orderItems: OrderItem[],
  products: Product[],
) => {
  try {
    const {
      email,
      orderNumber,
      totalAmount,
      subtotalAmount,
      taxAmount,
      shippingAmount,
      discountAmount,
      paymentMethod,
      paymentStatus,
      status,
    } = order;

    if (!email) {
      console.error("Cannot send order confirmation: Email is missing");
      return { success: false, error: "Email is missing" };
    }

    // Create item rows for the order
    const itemsHtml = orderItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const imageUrl = product?.imageUrl || "";

        return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <img src="${imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${item.name}</strong>
            ${item.weight ? `<br><span style="color: #777; font-size: 12px;">Weight: ${item.weight}</span>` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${parseFloat(item.price.toString()).toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${parseFloat(item.subtotal.toString()).toFixed(2)}</td>
        </tr>
      `;
      })
      .join("");

    // Create HTML email template with improved design matching website theme
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${orderNumber}</title>
        <style>
          @media only screen and (max-width: 600px) {
            .mobile-container {
              width: 100% !important;
              padding: 10px !important;
            }
            .mobile-header {
              padding: 20px 15px !important;
            }
            .mobile-logo {
              max-width: 150px !important;
            }
            .mobile-content {
              padding: 15px !important;
            }
            .mobile-table {
              display: block !important;
              width: 100% !important;
            }
            .mobile-table-cell {
              display: block !important;
              width: 100% !important;
              text-align: left !important;
              padding: 8px 15px !important;
            }
            .mobile-support-card {
              min-width: 100% !important;
              margin-bottom: 15px !important;
            }
            .mobile-hide {
              display: none !important;
            }
            .mobile-stack {
              display: block !important;
              width: 100% !important;
            }
            .mobile-stack[style*="display: none"] {
              display: block !important;
            }
            .mobile-center {
              text-align: center !important;
            }
            .mobile-padding {
              padding: 0 10px !important;
            }
            .mobile-spacer {
              height: 15px !important;
            }
          }
        </style>
      </head>
      <body style="font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #4B5563; max-width: 800px; margin: 0 auto; padding: 10px; background-color: #F9FAFB;">
        <!-- Enhanced Header with logo and background -->
        <div class="mobile-header" style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #d1fae5;">
          <img class="mobile-logo" src="https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png" alt="${STORE_NAME}" style="max-width: 180px; margin-bottom: 20px;">
          <h1 style="margin: 10px 0; color: #065F46; font-weight: 700; font-size: 32px; letter-spacing: -0.5px;">Order Confirmation</h1>
          <div style="width: 80px; height: 4px; background-color: #059669; margin: 15px auto;"></div>
          <p style="margin: 15px 0 0; color: #059669; font-size: 18px; font-weight: 500;">Thank you for shopping with us!</p>
          <p style="margin: 5px 0 0; color: #6B7280; font-size: 14px;">Order #: ${orderNumber}</p>
        </div>
        
        <!-- Order Info Card -->
        <div class="mobile-content" style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
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
                <td style="padding: 8px 0; text-align: right;">${new Date(order.createdAt || new Date()).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Order Status:</strong></td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background-color: ${
                    status === "pending"
                      ? "#FEF3C7"
                      : status === "processing"
                        ? "#DBEAFE"
                        : status === "completed"
                          ? "#D1FAE5"
                          : status === "failed"
                            ? "#FEE2E2"
                            : status === "cancelled"
                              ? "#E5E7EB"
                              : "#f9f9f9"
                  }; padding: 6px 12px; border-radius: 20px; font-size: 14px; color: ${
                    status === "pending"
                      ? "#92400E"
                      : status === "processing"
                        ? "#1E40AF"
                        : status === "completed"
                          ? "#065F46"
                          : status === "failed"
                            ? "#B91C1C"
                            : status === "cancelled"
                              ? "#374151"
                              : "#111827"
                  }; font-weight: 600;">${status.toUpperCase()}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Payment Method:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${
                  paymentMethod === "razorpay"
                    ? "Razorpay"
                    : paymentMethod === "phonepay"
                      ? "PhonePe"
                      : paymentMethod === "cod"
                        ? "Cash on Delivery"
                        : paymentMethod === "bank_transfer"
                          ? "Bank Transfer"
                          : paymentMethod
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B5563;"><strong>Payment Status:</strong></td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background-color: ${
                    (paymentStatus || "pending") === "pending"
                      ? "#FEF3C7"
                      : (paymentStatus || "pending") === "completed"
                        ? "#D1FAE5"
                        : (paymentStatus || "pending") === "failed"
                          ? "#FEE2E2"
                          : "#f9f9f9"
                  }; padding: 6px 12px; border-radius: 20px; font-size: 14px; color: ${
                    (paymentStatus || "pending") === "pending"
                      ? "#92400E"
                      : (paymentStatus || "pending") === "completed"
                        ? "#065F46"
                        : (paymentStatus || "pending") === "failed"
                          ? "#B91C1C"
                          : "#111827"
                  }; font-weight: 600;">${(paymentStatus || "pending").toUpperCase()}</span>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Order confirmation note -->
          <div style="text-align: center; margin: 30px 0; background-color: #f0fdf4; padding: 20px; border-radius: 10px;">
            <p style="color: #059669; font-weight: 600; font-size: 16px; margin: 0;">
              Thank you for choosing Millikit. We're preparing your order with care!
            </p>
          </div>
        </div>
        
        <!-- Order Details Section -->
        <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <h2 style="margin-top: 0; color: #065F46; font-weight: 600; font-size: 22px; margin-bottom: 20px; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px;">Order Details</h2>
          
          <table class="mobile-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #F3F4F6;">
                <th class="mobile-table-cell" style="padding: 12px; text-align: left; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">Product</th>
                <th class="mobile-table-cell mobile-hide" style="padding: 12px; text-align: center;">Quantity</th>
                <th class="mobile-table-cell mobile-hide" style="padding: 12px; text-align: right;">Price</th>
                <th class="mobile-table-cell" style="padding: 12px; text-align: right; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems
                .map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  const imageUrl = product?.imageUrl || "";

                  return `
                  <tr>
                    <td class="mobile-table-cell" style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB;">
                      <div style="display: flex; align-items: center;">
                        <img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                        <div>
                          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${item.name}</div>
                          ${item.weight ? `<div style="color: #6B7280; font-size: 14px;">Weight: ${item.weight}</div>` : ""}
                          <div class="mobile-stack" style="display: none; margin-top: 8px; font-size: 14px;">
                            <div style="margin-bottom: 4px;"><span style="color: #6B7280;">Qty:</span> <span style="font-weight: 500;">${item.quantity}</span></div>
                            <div style="margin-bottom: 4px;"><span style="color: #6B7280;">Price:</span> <span style="font-weight: 500;">₹${parseFloat(item.price.toString()).toFixed(2)}</span></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="mobile-table-cell mobile-hide" style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #4B5563;">${item.quantity}</td>
                    <td class="mobile-table-cell mobile-hide" style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #4B5563;">₹${parseFloat(item.price.toString()).toFixed(2)}</td>
                    <td class="mobile-table-cell" style="padding: 16px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600; color: #111827;">₹${parseFloat(item.subtotal.toString()).toFixed(2)}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
            <tfoot>
              <tr>
                <td class="mobile-table-cell" colspan="3" style="padding: 16px 12px; text-align: right; color: #4B5563;"><strong>Subtotal:</strong></td>
                <td class="mobile-table-cell" style="padding: 16px 12px; text-align: right; color: #4B5563;">₹${parseFloat(subtotalAmount.toString()).toFixed(2)}</td>
              </tr>
              ${
                discountAmount && parseFloat(discountAmount.toString()) > 0
                  ? `
              <tr>
                <td colspan="3" style="padding: 16px 12px; text-align: right; color: #4B5563;"><strong>Discount:</strong></td>
                <td style="padding: 16px 12px; text-align: right; color: #DC2626;">-₹${parseFloat(discountAmount.toString()).toFixed(2)}</td>
              </tr>
              `
                  : ""
              }
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
        
        <!-- Shipping Information - Enhanced -->
        <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); border: 1px solid #E5E7EB;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div style="margin-right: 15px; width: 40px; height: 40px; background-color: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 20px; color: #059669;">🚚</span>
            </div>
            <h2 style="margin: 0; color: #065F46; font-weight: 600; font-size: 22px;">Shipping Information</h2>
          </div>
          
          <div style="background: linear-gradient(to right, #f0fdf4, #ecfdf5); border-radius: 10px; padding: 20px; border-left: 4px solid #059669;">
            <p style="margin: 5px 0; color: #374151; font-weight: 500;">${order.shippingAddress}</p>
            <p style="margin: 15px 0 5px; color: #6B7280; font-size: 14px; font-style: italic;">Your order will be processed and shipped within 1-2 business days.</p>
          </div>
        </div>
        
        <!-- Help and Support - Enhanced design -->
        <div style="background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03); border: 1px solid #E5E7EB;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background-color: #dcfce7; width: 60px; height: 60px; border-radius: 50%; text-align: center; line-height: 60px; margin-bottom: 15px;">
              <span style="color: #059669; font-size: 24px; font-weight: bold;">?</span>
            </div>
            <h2 style="margin: 10px 0; color: #065F46; font-weight: 600; font-size: 24px;">Need Help?</h2>
            <div style="width: 60px; height: 3px; background-color: #059669; margin: 15px auto;"></div>
            <p style="color: #4B5563; margin-bottom: 20px;">If you have any questions about your order, our customer service team is here to help.</p>
          </div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
            <div class="mobile-support-card" style="flex: 1; min-width: 200px; padding: 20px; text-align: center; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.03); transition: transform 0.3s; border: 1px solid #d1fae5;">
              <div style="margin-bottom: 12px; width: 40px; height: 40px; background-color: #f0fdf4; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px; color: #059669;">✉</span>
              </div>
              <div style="font-weight: 600; color: #065F46; margin-bottom: 8px; font-size: 17px;">Email Support</div>
              <a href="mailto:support@millikit.com" style="color: #059669; text-decoration: none; font-weight: 500; display: block;">support@millikit.com</a>
              <p style="margin-top: 8px; font-size: 13px; color: #6B7280;">We typically respond within 24 hours</p>
            </div>
            
            <div class="mobile-support-card" style="flex: 1; min-width: 200px; padding: 20px; text-align: center; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.03); transition: transform 0.3s; border: 1px solid #d1fae5;">
              <div style="margin-bottom: 12px; width: 40px; height: 40px; background-color: #f0fdf4; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px; color: #059669;">📞</span>
              </div>
              <div style="font-weight: 600; color: #065F46; margin-bottom: 8px; font-size: 17px;">Phone Support</div>
              <a href="tel:+917548871552" style="color: #059669; text-decoration: none; font-weight: 500; display: block;">+91 7548871552</a>
              <p style="margin-top: 8px; font-size: 13px; color: #6B7280;">Available Mon-Fri, 9am-6pm IST</p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 15px; background-color: #f0fdf4; border-radius: 10px;">
            <p style="color: #065F46; font-weight: 500;">Visit <a href="https://millik-1.onrender.com" style="color: #059669; text-decoration: none; font-weight: 600;">millik-1.onrender.com</a> to explore more premium millet products</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 20px; color: #6B7280; font-size: 14px; background-color: #F3F4F6; border-radius: 12px; margin-top: 10px;">
          <img src="https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png" alt="${STORE_NAME}" style="max-width: 120px; margin-bottom: 15px;">
          <p style="margin-bottom: 10px; font-weight: 500;">&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          <p style="margin-bottom: 20px; font-style: italic; color: #059669;">Premium Millet Products for a Healthier Lifestyle</p>
          
          <!-- Navigation Links with improved styling -->
          <div style="margin-bottom: 25px; display: inline-block; background-color: #FFFFFF; padding: 12px 20px; border-radius: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <a href="https://millik-1.onrender.com" style="color: #059669; text-decoration: none; margin: 0 10px; font-weight: 600; transition: color 0.2s;">Home</a>
            <a href="https://millik-1.onrender.com/products" style="color: #059669; text-decoration: none; margin: 0 10px; font-weight: 600; transition: color 0.2s;">Products</a>
            <a href="https://millik-1.onrender.com/about" style="color: #059669; text-decoration: none; margin: 0 10px; font-weight: 600; transition: color 0.2s;">About Us</a>
            <a href="https://millik-1.onrender.com/contact" style="color: #059669; text-decoration: none; margin: 0 10px; font-weight: 600; transition: color 0.2s;">Contact</a>
          </div>
          
          <!-- Social Media Icons (placeholder) -->
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; width: 36px; height: 36px; background-color: #059669; border-radius: 50%; margin: 0 5px; text-align: center; line-height: 36px; color: white; font-weight: bold;">f</span>
            <span style="display: inline-block; width: 36px; height: 36px; background-color: #059669; border-radius: 50%; margin: 0 5px; text-align: center; line-height: 36px; color: white; font-weight: bold;">i</span>
            <span style="display: inline-block; width: 36px; height: 36px; background-color: #059669; border-radius: 50%; margin: 0 5px; text-align: center; line-height: 36px; color: white; font-weight: bold;">t</span>
          </div>
          
          <p style="color: #9CA3AF; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 15px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;

    return await sendEmail(
      email,
      `Your Order Confirmation #${orderNumber} - ${STORE_NAME}`,
      html,
    );
  } catch (error) {
    console.error(
      "Error generating order confirmation email:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
