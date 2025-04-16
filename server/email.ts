import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { Order, OrderItem, Product } from "@shared/schema";

// Load environment variables
try {
  if (fs.existsSync(".env")) {
    const envConfig = dotenv.parse(fs.readFileSync(".env"));
    for (const key in envConfig) {
      if (key.startsWith('EMAIL_') && !process.env[key]) {
        process.env[key] = envConfig[key];
      }
    }
    console.log("Loaded email environment variables from .env file");
  }
} catch (error) {
  console.error(
    "Error loading .env file:",
    error instanceof Error ? error.message : String(error),
  );
}

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp-relay.brevo.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER || "8a3bac001@smtp-brevo.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "z5dbE7VGfLqh1ZQB";
const EMAIL_FROM = process.env.EMAIL_FROM || "skdhara2222@gmail.com";
const STORE_NAME = process.env.STORE_NAME || "Millikit";

// Create email transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Log email configuration (for debugging)
console.log("Email Configuration:", {
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false,
  user: EMAIL_USER,
  from: EMAIL_FROM,
  storeName: STORE_NAME
});

// Send shipping notification email
export const sendShippingNotificationEmail = async (
  order: Order,
  trackingId: string
) => {
  try {
    const { email, orderNumber } = order;

    if (!email) {
      return {
        success: false,
        error: "No email address provided for the order",
      };
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Order Has Been Shipped - ${STORE_NAME}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
        <style>
          /* Base styles */
          body, html {
            font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            background-color: #F9FAFB;
            color: #4B5563;
          }
          
          * {
            box-sizing: border-box;
          }
          
          /* Animation keyframes */
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes shimmer {
            0% { background-position: -468px 0; }
            100% { background-position: 468px 0; }
          }
          
          @keyframes slideRight {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(0); }
          }
          
          .fadeInUp {
            animation: fadeIn 0.8s ease-out forwards;
          }
          
          .pulse {
            animation: pulse 2s infinite ease-in-out;
          }
          
          .bounce {
            animation: bounce 2s infinite ease-in-out;
          }
          
          .shimmer {
            background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0) 40%);
            background-size: 600px 100%;
            animation: shimmer 2s infinite linear;
          }
          
          .slide-right {
            animation: slideRight 1s ease-out forwards;
          }
          
          .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            position: relative;
          }
          
          .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"><path d="M20 20L80 80" stroke="%23E5E7EB" stroke-width="0.5"/><path d="M80 20L20 80" stroke="%23E5E7EB" stroke-width="0.5"/></svg>');
            background-size: 30px 30px;
            background-repeat: repeat;
            opacity: 0.3;
            z-index: 0;
            pointer-events: none;
          }
          
          .header-gradient {
            background: linear-gradient(135deg, #10b981 0%, #047857 100%);
            padding: 3rem 2rem;
            position: relative;
            overflow: hidden;
            text-align: center;
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          .pattern-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"><circle cx="10" cy="10" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="30" cy="10" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="50" cy="10" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="70" cy="10" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="90" cy="10" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="10" cy="30" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="30" cy="30" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="50" cy="30" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="70" cy="30" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="90" cy="30" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="10" cy="50" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="30" cy="50" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="50" cy="50" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="70" cy="50" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="90" cy="50" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="10" cy="70" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="30" cy="70" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="50" cy="70" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="70" cy="70" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="90" cy="70" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="10" cy="90" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="30" cy="90" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="50" cy="90" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="70" cy="90" r="2" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="90" cy="90" r="2" fill="%23FFFFFF" fill-opacity="0.2"/></svg>');
            background-repeat: repeat;
            opacity: 0.15;
            z-index: 1;
          }
          
          .header-sparkle {
            position: absolute;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: white;
            box-shadow: 0 0 40px 5px rgba(255, 255, 255, 0.8);
            z-index: 2;
            opacity: 0.6;
            animation: pulse 3s infinite ease-in-out;
          }
          
          .sparkle-1 {
            top: 20%;
            left: 15%;
            animation-delay: 0s;
          }
          
          .sparkle-2 {
            top: 65%;
            left: 25%;
            animation-delay: 0.5s;
          }
          
          .sparkle-3 {
            top: 40%;
            right: 25%;
            animation-delay: 1s;
          }
          
          .sparkle-4 {
            top: 15%;
            right: 15%;
            animation-delay: 1.5s;
          }
          
          .sparkle-5 {
            top: 75%;
            right: 10%;
            animation-delay: 2s;
          }
          
          .ribbon {
            position: absolute;
            top: 0;
            right: 0;
            width: 150px;
            height: 150px;
            overflow: hidden;
            z-index: 3;
          }
          
          .ribbon-content {
            position: absolute;
            top: 30px;
            right: -35px;
            transform: rotate(45deg);
            background: #f0fdf4;
            color: #059669;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 50px;
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
            z-index: 4;
          }
          
          .content-section {
            padding: 2.5rem;
            background: white;
            position: relative;
            z-index: 2;
          }
          
          .info-card {
            background-color: #F0FDF4;
            border-radius: 12px;
            padding: 1.8rem;
            margin: 1.5rem 0;
            border-left: 4px solid #059669;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .info-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          
          .info-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, transparent 50%, rgba(5, 150, 105, 0.1) 50%);
            border-radius: 0 0 0 100px;
            z-index: 1;
          }
          
          .info-card::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: -10px;
            width: 60px;
            height: 60px;
            background: linear-gradient(45deg, transparent 50%, rgba(5, 150, 105, 0.05) 50%);
            border-radius: 100px 0 0 0;
            z-index: 1;
          }
          
          .card {
            background: white;
            border-radius: 16px;
            padding: 1.8rem;
            margin: 2rem 0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #E5E7EB;
            transition: transform 0.3s, box-shadow 0.3s;
            position: relative;
            overflow: hidden;
          }
          
          .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          
          .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 4px 4px 0 0;
          }
          
          .card-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: #059669;
            font-size: 28px;
            box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.2);
          }
          
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 14px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.2);
            position: relative;
            overflow: hidden;
            z-index: 1;
          }
          
          .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.1) 100%);
            transition: all 0.6s;
            z-index: -1;
          }
          
          .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 25px -5px rgba(5, 150, 105, 0.3);
          }
          
          .btn:hover::before {
            left: 100%;
          }
          
          .footer {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            padding: 2.5rem 2rem;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            position: relative;
            overflow: hidden;
          }
          
          .footer::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #10b981, #059669, #10b981);
            opacity: 0.7;
          }
          
          .social-icons {
            display: flex;
            justify-content: center;
            margin: 1.5rem 0;
          }
          
          .social-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 50%;
            color: white;
            margin: 0 10px;
            transition: all 0.3s;
            box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);
          }
          
          .social-icon:hover {
            transform: translateY(-3px) scale(1.1);
            box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3);
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #d1d5db, transparent);
            margin: 1.5rem 0;
          }
          
          .status-badge {
            display: inline-block;
            background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%);
            color: #065F46;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 15px;
            box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.1);
            position: relative;
            z-index: 2;
          }
          
          .tracking-section {
            position: relative;
            background: linear-gradient(165deg, #f0fdf4 0%, #dcfce7 100%);
            padding: 2rem;
            border-radius: 16px;
            margin: 2rem 0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #d1fae5;
            overflow: hidden;
            transform-style: preserve-3d;
            perspective: 1000px;
          }
          
          .tracking-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="40" stroke="%23059669" stroke-width="0.5" stroke-dasharray="4 4"/></svg>');
            background-size: 200px 200px;
            background-position: center;
            opacity: 0.15;
            z-index: 1;
          }
          
          /* Progress tracker */
          .progress-tracker {
            display: flex;
            justify-content: space-between;
            margin: 40px 0 30px;
            position: relative;
            z-index: 2;
          }
          
          .progress-tracker::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            height: 4px;
            width: 100%;
            background: linear-gradient(90deg, rgba(209, 250, 229, 0.4) 0%, #d1fae5 100%);
            border-radius: 4px;
            z-index: 1;
          }
          
          .progress-tracker::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            height: 4px;
            width: 70%; /* Update this based on progress */
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            border-radius: 4px;
            z-index: 2;
            transition: width 1s ease-in-out;
          }
          
          .progress-step {
            position: relative;
            z-index: 3;
            background-color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #10B981;
            box-shadow: 0 0 0 4px #ECFDF5;
            transition: all 0.3s ease;
          }
          
          .progress-step.active {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            transform: scale(1.2);
            box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.3);
          }
          
          .progress-step.completed {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
          }
          
          .progress-step.pulse {
            animation: pulse 2s infinite;
          }
          
          .progress-label {
            position: absolute;
            bottom: -32px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 13px;
            color: #4B5563;
            white-space: nowrap;
            font-weight: 500;
            background-color: white;
            padding: 4px 8px;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          
          .progress-label.active {
            color: #065F46;
            font-weight: 600;
          }
          
          .float-image {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 120px;
            opacity: 0.25;
            z-index: 1;
            transform: rotate(10deg);
            animation: bounce 3s infinite ease-in-out;
          }
          
          .shine-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, 
              rgba(255,255,255,0) 0%, 
              rgba(255,255,255,0.03) 30%, 
              rgba(255,255,255,0.05) 40%, 
              rgba(255,255,255,0) 60%
            );
            transform: translateY(100%);
            animation: shine 3s infinite;
          }
          
          @keyframes shine {
            0% {
              transform: translateY(-100%) rotate(25deg);
            }
            100% {
              transform: translateY(100%) rotate(25deg);
            }
          }
          
          .millet-decoration {
            position: absolute;
            width: 100%;
            height: 160px;
            bottom: 0;
            left: 0;
            background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" fill="none"><path d="M20,80 Q50,40 80,80 T140,80 T200,80 T260,80" stroke="%23D1FAE5" stroke-width="3" fill="none"/><path d="M20,80 Q50,40 80,80 T140,80 T200,80 T260,80" stroke="%2310B981" stroke-width="1" fill="none"/><circle cx="80" cy="80" r="3" fill="%2310B981"/><circle cx="140" cy="80" r="3" fill="%2310B981"/><circle cx="200" cy="80" r="3" fill="%2310B981"/><circle cx="260" cy="80" r="3" fill="%2310B981"/></svg>');
            background-repeat: no-repeat;
            background-position: bottom;
            opacity: 0.5;
            pointer-events: none;
          }
          
          .cursive-text {
            font-family: 'Dancing Script', cursive;
            color: #065F46;
            font-size: 28px;
            letter-spacing: 1px;
            margin: 10px 0;
          }
          
          .logo-container {
            position: relative;
            display: inline-block;
            margin-bottom: 20px;
          }
          
          .logo-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(5, 150, 105, 0.4) 0%, rgba(5, 150, 105, 0) 70%);
            z-index: 1;
            animation: pulse 3s infinite;
          }
          
          /* Mobile responsive styles */
          @media only screen and (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .container {
              width: 100%;
              border-radius: 15px;
            }
            
            .header-gradient {
              padding: 1.8rem 1rem;
            }
            
            .content-section {
              padding: 1.8rem;
            }
            
            .mobile-logo {
              max-width: 130px !important;
            }
            
            .mobile-stack {
              display: block !important;
              width: 100% !important;
              margin-bottom: 15px !important;
            }
            
            .mobile-center {
              text-align: center !important;
            }
            
            .mobile-hide {
              display: none !important;
            }
            
            .mobile-small-text {
              font-size: 14px !important;
            }
            
            .mobile-small-heading {
              font-size: 22px !important;
            }
            
            .mobile-narrow-padding {
              padding: 18px !important;
            }
            
            .navigation-links {
              display: block !important;
              text-align: center !important;
              padding: 12px !important;
            }
            
            .navigation-links a {
              display: block !important;
              margin: 10px 0 !important;
            }
            
            .progress-step {
              width: 24px;
              height: 24px;
              font-size: 10px;
            }
            
            .progress-label {
              font-size: 10px;
              bottom: -26px;
            }
            
            .social-icons {
              justify-content: center !important;
            }
            
            .float-image {
              width: 70px;
            }
            
            .ribbon {
              width: 100px;
              height: 100px;
            }
            
            .ribbon-content {
              top: 20px;
              right: -35px;
              font-size: 10px;
              padding: 5px 40px;
            }
            
            .tracking-section {
              padding: 18px !important;
            }
            
            .cursive-text {
              font-size: 24px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #F9FAFB;">
        <!-- Main container -->
        <div class="container fadeInUp" style="max-width: 650px; margin: 0 auto;">
          <!-- Header section -->
          <div class="header-gradient" style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 3rem 2rem; position: relative; overflow: hidden; text-align: center; color: white;">
            <!-- Pattern overlay -->
            <div class="pattern-overlay"></div>
            
            <!-- Sparkles -->
            <div class="header-sparkle sparkle-1"></div>
            <div class="header-sparkle sparkle-2"></div>
            <div class="header-sparkle sparkle-3"></div>
            <div class="header-sparkle sparkle-4"></div>
            <div class="header-sparkle sparkle-5"></div>
            
            <!-- Ribbon -->
            <div class="ribbon">
              <div class="ribbon-content">SHIPPED</div>
            </div>
            
            <!-- Logo with glow effect -->
            <div class="logo-container">
              <div class="logo-glow"></div>
              <img class="mobile-logo" src="https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png" alt="${STORE_NAME}" style="max-width: 160px; position: relative; z-index: 2;">
            </div>
            
            <h1 class="mobile-small-heading" style="margin: 15px 0; font-weight: 700; font-size: 32px; letter-spacing: -0.5px; position: relative; z-index: 2;">Your Order Has Been Shipped!</h1>
            
            <div style="width: 80px; height: 4px; background: linear-gradient(90deg, rgba(255,255,255,0.5), #FFFFFF, rgba(255,255,255,0.5)); margin: 15px auto; position: relative; z-index: 2;"></div>
            
            <p class="cursive-text" style="margin: 20px 0 5px; font-size: 28px; position: relative; z-index: 2; color: white;">
              Your journey to health is on its way!
            </p>
            
            <p class="mobile-small-text" style="margin: 5px 0 20px; font-size: 16px; opacity: 0.9; position: relative; z-index: 2;">
              Order #: ${orderNumber}
            </p>
            
            <div class="status-badge pulse" style="background: linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%); color: #059669; position: relative; z-index: 2; border: 1px solid rgba(5, 150, 105, 0.3);">
              SHIPPING IN PROGRESS
            </div>
            
            <!-- Shine effect -->
            <div class="shine-effect"></div>
          </div>
          
          <!-- Content section -->
          <div class="content-section mobile-narrow-padding" style="padding: 2.5rem; background: white;">
            <p style="margin-bottom: 20px; font-size: 18px; color: #111827; font-weight: 500;">Dear Customer,</p>
            
            <p style="margin-bottom: 25px; font-size: 16px; color: #4B5563; line-height: 1.8;">
              Great news! Your order <strong style="color: #065F46; font-weight: 600;">#${orderNumber}</strong> has been carefully packed and is now on its way to you. We're excited for you to experience our premium millet products that will enhance your journey to a healthier lifestyle. Track your package using the information below.
            </p>
            
            <!-- Shipping progress tracker -->
            <div class="tracking-section mobile-narrow-padding" style="position: relative; background: linear-gradient(165deg, #f0fdf4 0%, #dcfce7 100%); padding: 2rem; border-radius: 16px; margin: 2rem 0;">
              <h3 style="margin-top: 0; color: #065F46; font-weight: 600; font-size: 20px; position: relative; z-index: 2;">Shipping Progress</h3>
              
              <div class="progress-tracker">
                <div class="progress-step completed">
                  <span style="font-size: 12px;">✓</span>
                  <span class="progress-label">Order Placed</span>
                </div>
                <div class="progress-step completed">
                  <span style="font-size: 12px;">✓</span>
                  <span class="progress-label">Processing</span>
                </div>
                <div class="progress-step active pulse">
                  <span style="font-size: 12px;">•</span>
                  <span class="progress-label active">Shipped</span>
                </div>
                <div class="progress-step">
                  <span style="font-size: 12px;">•</span>
                  <span class="progress-label">Delivered</span>
                </div>
              </div>
              
              <div style="margin-top: 40px; position: relative; z-index: 2;">
                <h4 style="color: #065F46; margin-bottom: 15px; font-weight: 600; font-size: 18px;">Tracking Information</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; background-color: rgba(255, 255, 255, 0.7); border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <tr>
                    <td style="padding: 12px 15px; color: #4B5563; border-bottom: 1px solid #d1fae5;"><strong>Order Number:</strong></td>
                    <td style="padding: 12px 15px; text-align: right; font-weight: 600; border-bottom: 1px solid #d1fae5;">${orderNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; color: #4B5563; border-bottom: 1px solid #d1fae5;"><strong>Tracking ID:</strong></td>
                    <td style="padding: 12px 15px; text-align: right; font-weight: 600; color: #065F46; border-bottom: 1px solid #d1fae5;">${trackingId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; color: #4B5563;"><strong>Shipping Date:</strong></td>
                    <td style="padding: 12px 15px; text-align: right;">${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Animated truck icon -->
              <div class="float-image bounce">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
            </div>
            
            <!-- Delivery estimate -->
            <div class="info-card" style="background: linear-gradient(165deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 16px; padding: 1.8rem; margin: 2rem 0; border-left: 4px solid #059669; position: relative;">
              <h3 style="margin-top: 0; color: #065F46; font-weight: 600; font-size: 20px; position: relative; z-index: 2;">Estimated Delivery</h3>
              
              <div style="position: relative; z-index: 2; background-color: rgba(255, 255, 255, 0.7); padding: 15px; border-radius: 8px; margin-top: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <div style="background-color: #065F46; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                    <span>📅</span>
                  </div>
                  <div>
                    <p style="margin: 0; color: #065F46; font-weight: 600; font-size: 16px;">Expected to arrive in 3-5 business days</p>
                    <p style="margin: 5px 0 0; color: #6B7280; font-size: 14px;">${new Date(new Date().setDate(new Date().getDate() + 5)).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>
                <p style="margin: 0; color: #6B7280; font-size: 14px; font-style: italic; padding-left: 55px;">Delivery times may vary based on your location and local delivery conditions.</p>
              </div>
              
              <!-- Tracking button -->
              <div style="margin-top: 25px; text-align: center; position: relative; z-index: 2;">
                <a href="#" class="btn" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 30px; border-radius: 50px; text-decoration: none; font-weight: 600;">Track Your Package</a>
              </div>
            </div>
            
            <!-- Shipping details -->
            <div class="card" style="background: white; border-radius: 16px; padding: 2rem; margin: 2rem 0;">
              <h3 style="margin-top: 0; color: #111827; font-weight: 600; font-size: 20px; border-bottom: 1px solid #E5E7EB; padding-bottom: 15px; margin-bottom: 20px;">Package Information</h3>
              
              <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 15px;">
                <div class="mobile-stack" style="flex: 1; min-width: 200px; background-color: #F9FAFB; border-radius: 8px; padding: 15px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                  <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div style="width: 30px; height: 30px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; color: #059669;">📦</div>
                    <h4 style="margin: 0; color: #4B5563; font-size: 16px; font-weight: 500;">Shipping Method</h4>
                  </div>
                  <p style="margin: 0; color: #111827; font-weight: 500; padding-left: 40px;">Premium Express Delivery</p>
                </div>
                
                <div class="mobile-stack" style="flex: 1; min-width: 200px; background-color: #F9FAFB; border-radius: 8px; padding: 15px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                  <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div style="width: 30px; height: 30px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; color: #059669;">🚚</div>
                    <h4 style="margin: 0; color: #4B5563; font-size: 16px; font-weight: 500;">Carrier</h4>
                  </div>
                  <p style="margin: 0; color: #111827; font-weight: 500; padding-left: 40px;">Delhivery Express</p>
                </div>
              </div>
              
              <div class="divider" style="height: 1px; background: linear-gradient(90deg, transparent, #d1d5db, transparent); margin: 1.8rem 0;"></div>
              
              <div style="background-color: #F0FDF4; border-radius: 8px; padding: 15px; position: relative; overflow: hidden;">
                <h4 style="margin: 0 0 15px; color: #065F46; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
                  <span style="display: inline-block; width: 24px; height: 24px; background-color: #065F46; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 12px;">!</span>
                  Important Information
                </h4>
                <ul style="margin: 10px 0; padding-left: 34px; color: #4B5563; list-style-type: none;">
                  <li style="margin-bottom: 10px; position: relative;">
                    <span style="position: absolute; left: -20px; color: #059669;">✓</span>
                    Your package may require a signature upon delivery.
                  </li>
                  <li style="margin-bottom: 10px; position: relative;">
                    <span style="position: absolute; left: -20px; color: #059669;">✓</span>
                    Please ensure someone is available to receive the package.
                  </li>
                  <li style="position: relative;">
                    <span style="position: absolute; left: -20px; color: #059669;">✓</span>
                    If you miss the delivery, the carrier will leave instructions for rescheduling.
                  </li>
                </ul>
                
                <!-- Background decorative element -->
                <div style="position: absolute; bottom: -10px; right: -10px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(5, 150, 105, 0.1) 0%, rgba(5, 150, 105, 0) 70%); border-radius: 50%;"></div>
              </div>
            </div>
            
            <!-- Product details preview -->
            <div class="card" style="background: linear-gradient(165deg, #ffffff 0%, #f9fafb 100%); border-radius: 16px; padding: 2rem; margin: 2rem 0;">
              <h3 style="margin-top: 0; color: #111827; font-weight: 600; font-size: 20px; border-bottom: 1px solid #E5E7EB; padding-bottom: 15px; margin-bottom: 20px;">What's In Your Package</h3>
              
              <div style="text-align: center; margin: 20px 0; color: #065F46;">
                <div class="cursive-text" style="margin-bottom: 15px;">Premium Millet Products</div>
                <p style="color: #4B5563; margin-bottom: 20px;">We've carefully selected and packed your order with love. Get ready to enjoy the best quality millets for your health journey!</p>
                
                <div style="width: 100%; height: 4px; background: linear-gradient(90deg, transparent, rgba(5, 150, 105, 0.3), transparent); margin: 25px 0;"></div>
                
                <div style="display: flex; justify-content: center;">
                  <div style="text-align: center; padding: 0 15px;">
                    <div style="width: 60px; height: 60px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #059669; font-size: 28px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">🌱</div>
                    <p style="margin: 0; color: #4B5563; font-size: 14px;">100% Natural</p>
                  </div>
                  <div style="text-align: center; padding: 0 15px;">
                    <div style="width: 60px; height: 60px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #059669; font-size: 28px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">🌿</div>
                    <p style="margin: 0; color: #4B5563; font-size: 14px;">Organic</p>
                  </div>
                  <div style="text-align: center; padding: 0 15px;">
                    <div style="width: 60px; height: 60px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #059669; font-size: 28px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">❤️</div>
                    <p style="margin: 0; color: #4B5563; font-size: 14px;">Heart Healthy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Help and Support section -->
          <div style="background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%); padding: 2.5rem 2rem; border-top: 1px solid #E5E7EB; position: relative;">
            <div class="millet-decoration"></div>
            
            <h2 class="mobile-small-heading" style="margin: 0 0 30px; color: #111827; font-weight: 600; font-size: 24px; text-align: center; position: relative; z-index: 2;">Need Assistance?</h2>
            
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 25px 0; position: relative; z-index: 2;">
              <!-- Email Support Card -->
              <div class="card mobile-stack" style="flex: 1; min-width: 200px; background: white; border-radius: 16px; padding: 1.8rem; text-align: center;">
                <div class="card-icon" style="width: 60px; height: 60px; background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #059669; font-size: 28px;">
                  ✉
                </div>
                <h3 style="margin: 10px 0; color: #111827; font-size: 18px; font-weight: 600;">Email Support</h3>
                <p style="margin: 0 0 20px; color: #6B7280; font-size: 14px;">Questions about your order? Our team is here to help you every step of the way.</p>
                <a href="mailto:support@millikit.com" style="color: #059669; text-decoration: none; font-weight: 500; display: block; background-color: #F0FDF4; padding: 10px; border-radius: 8px; transition: all 0.3s;">support@millikit.com</a>
              </div>
              
              <!-- Phone Support Card -->
              <div class="card mobile-stack" style="flex: 1; min-width: 200px; background: white; border-radius: 16px; padding: 1.8rem; text-align: center;">
                <div class="card-icon" style="width: 60px; height: 60px; background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #059669; font-size: 28px;">
                  📞
                </div>
                <h3 style="margin: 10px 0; color: #111827; font-size: 18px; font-weight: 600;">Phone Support</h3>
                <p style="margin: 0 0 20px; color: #6B7280; font-size: 14px;">Need immediate assistance? Call our dedicated customer support line.</p>
                <a href="tel:+917548871552" style="color: #059669; text-decoration: none; font-weight: 500; display: block; background-color: #F0FDF4; padding: 10px; border-radius: 8px; transition: all 0.3s;">+91 7548871552</a>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); padding: 2.5rem 2rem; text-align: center; border-top: 1px solid #E5E7EB;">
            <img src="https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png" alt="${STORE_NAME}" style="max-width: 130px; margin-bottom: 20px;">
            
            <p class="cursive-text" style="margin: 5px 0 20px; font-style: italic; font-weight: 500;">Premium Millet Products for a Healthier Lifestyle</p>
            
            <!-- Navigation Links -->
            <div class="navigation-links" style="margin: 25px auto; display: inline-block; background: linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%); padding: 15px 25px; border-radius: 50px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <a href="https://millik-1.onrender.com" style="color: #059669; text-decoration: none; margin: 0 12px; font-weight: 600; transition: all 0.3s;">Home</a>
              <a href="https://millik-1.onrender.com/products" style="color: #059669; text-decoration: none; margin: 0 12px; font-weight: 600; transition: all 0.3s;">Products</a>
              <a href="https://millik-1.onrender.com/about" style="color: #059669; text-decoration: none; margin: 0 12px; font-weight: 600; transition: all 0.3s;">About Us</a>
              <a href="https://millik-1.onrender.com/contact" style="color: #059669; text-decoration: none; margin: 0 12px; font-weight: 600; transition: all 0.3s;">Contact</a>
            </div>
            
            <!-- Social Media Icons -->
            <div class="social-icons" style="display: flex; justify-content: center; margin: 25px 0;">
              <div class="social-icon" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; color: white; margin: 0 10px;">f</div>
              <div class="social-icon" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; color: white; margin: 0 10px;">i</div>
              <div class="social-icon" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; color: white; margin: 0 10px;">t</div>
            </div>
            
            <div class="divider" style="height: 1px; background: linear-gradient(90deg, transparent, #d1d5db, transparent); margin: 1.5rem 0;"></div>
            
            <p style="margin: 15px 0; color: #6B7280; font-size: 14px;">&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
            
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 15px;">This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmail(
      email,
      `Your Order Has Been Shipped #${orderNumber} - ${STORE_NAME}`,
      html
    );
  } catch (error) {
    console.error("Error sending shipping notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Send email
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    console.log(`Attempting to send email to ${to} with subject "${subject}"`);
    
    const fromName = process.env.EMAIL_FROM_NAME || "MILLIKIT";
    const mailOptions = {
      from: `"${fromName}" <${EMAIL_FROM}>`,
      to,
      subject,
      html,
    };
    
    console.log("Email configuration:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      host: EMAIL_HOST,
      port: EMAIL_PORT
    });
    
    // Log a short HTML preview (first 100 chars) to avoid huge logs
    console.log("Email HTML preview (first 100 chars):", html.substring(0, 100) + "...");
    
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", {
      messageId: info.messageId,
      response: info.response
    });
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error("Error sending email:");
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      // Log more details if available
      if ('code' in error) {
        console.error("Error code:", (error as any).code);
      }
      
      if ('response' in error) {
        console.error("SMTP Response:", (error as any).response);
      }
      
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    } else {
      console.error("Unknown error:", String(error));
      return {
        success: false,
        error: "Unknown error occurred"
      };
    }
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
      shippingAddress
    } = order;

    if (!email) {
      console.error("Cannot send order confirmation: Email is missing");
      return { success: false, error: "Email is missing" };
    }

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    
    // Format date as: "15 April, 2025"
    const estimatedDeliveryDate = deliveryDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    // Create item rows for the order
    const itemsHtml = orderItems
      .map((item, index) => {
        const product = products.find((p) => p.id === item.productId);
        const imageUrl = product?.imageUrl || "";
        const isEven = index % 2 === 0;

        return `
        <tr style="background-color: ${isEven ? '#FFFFFF' : '#F9FAFB'}; animation-delay: ${index * 0.1}s;" class="animate-item">
          <td style="padding: 15px; border-bottom: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB;">
            <div style="display: flex; align-items: center;">
              <div style="flex-shrink: 0; margin-right: 15px; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); width: 70px; height: 70px; background-color: #F9FAFB;">
                <img src="${imageUrl}" alt="${item.name}" width="70" height="70" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
              <div>
                <div style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 5px;">${item.name}</div>
                ${item.weight ? `<div style="color: #6B7280; font-size: 14px;">Weight: ${item.weight}</div>` : ""}
              </div>
            </div>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #4B5563; font-weight: 500; border-right: 1px solid #E5E7EB;">
            <div style="display: inline-block; min-width: 30px; background-color: #F0FDF4; padding: 5px 10px; border-radius: 20px; color: #065F46; font-weight: 600;">
              ${item.quantity}
            </div>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #374151; font-weight: 500; border-right: 1px solid #E5E7EB;">₹${parseFloat(item.price.toString()).toFixed(2)}</td>
          <td style="padding: 15px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #065F46; font-weight: 600;">₹${parseFloat(item.subtotal.toString()).toFixed(2)}</td>
        </tr>
      `;
      })
      .join("");

    // Create HTML for order confirmation email
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
  <style type="text/css">
    /* Base styles */
    body, p, h1, h2, h3, h4, h5, h6, table, td, th {
      margin: 0;
      padding: 0;
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    @keyframes shimmer {
      0% { background-position: -468px 0; }
      100% { background-position: 468px 0; }
    }
    
    @keyframes slideInRight {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes progressBar {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    
    .header-pulse {
      animation: pulse 2s infinite ease-in-out;
    }
    
    .shimmer-effect {
      background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
      background-size: 600px 100%;
      animation: shimmer 2s infinite linear;
    }
    
    .animate-item {
      animation: fadeIn 0.5s ease-out forwards;
    }
    
    .progress-animation {
      animation: progressBar 1.5s ease-out forwards;
    }
    
    .slide-in-right {
      animation: slideInRight 0.5s ease-out forwards;
    }
    
    .cursive-text {
      font-family: 'Dancing Script', cursive;
    }
    
    @media only screen and (max-width: 600px) {
      .mobile-full-width {
        width: 100% !important;
      }
      
      .mobile-center {
        text-align: center !important;
      }
      
      .mobile-padding {
        padding: 20px !important;
      }
      
      .mobile-hidden {
        display: none !important;
      }
      
      .mobile-stack {
        display: block !important;
        width: 100% !important;
      }
      
      .mobile-small-text {
        font-size: 14px !important;
      }
      
      .mobile-order-details {
        padding: 0 15px !important;
      }
      
      .mobile-product-layout td {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
      
      .mobile-product-image {
        margin: 0 auto 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #4B5563;">
  <!-- Main container -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #F9FAFB; padding: 20px;">
    <tr>
      <td align="center">
        <!-- Email container -->
        <table border="0" cellpadding="0" cellspacing="0" width="650" role="presentation" class="mobile-full-width" style="max-width: 650px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); position: relative;">
          <!-- Background pattern -->
          <tr>
            <td style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTIwIDIwTDgwIDgwIiBzdHJva2U9IiNFNUU3RUIiIHN0cm9rZS13aWR0aD0iMC41Ii8+PHBhdGggZD0iTTgwIDIwTDIwIDgwIiBzdHJva2U9IiNFNUU3RUIiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9zdmc+'); background-size: 30px 30px; background-repeat: repeat; opacity: 0.3; z-index: 0;"></td>
          </tr>
          
          <!-- Header with animations -->
          <tr>
            <td style="position: relative; z-index: 1; background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 40px 30px 30px; text-align: center; border-bottom: 5px solid rgba(5, 150, 105, 0.3);">
              <!-- Header sparkle effects -->
              <div style="position: absolute; top: 15%; left: 15%; width: 8px; height: 8px; border-radius: 50%; background-color: white; box-shadow: 0 0 20px 3px rgba(255, 255, 255, 0.8); opacity: 0.7; animation: pulse 2s infinite ease-in-out;"></div>
              <div style="position: absolute; top: 60%; left: 22%; width: 6px; height: 6px; border-radius: 50%; background-color: white; box-shadow: 0 0 15px 2px rgba(255, 255, 255, 0.8); opacity: 0.5; animation: pulse 3s infinite ease-in-out 0.5s;"></div>
              <div style="position: absolute; top: 25%; right: 18%; width: 10px; height: 10px; border-radius: 50%; background-color: white; box-shadow: 0 0 25px 4px rgba(255, 255, 255, 0.8); opacity: 0.6; animation: pulse 4s infinite ease-in-out 1s;"></div>
              <div style="position: absolute; top: 70%; right: 25%; width: 7px; height: 7px; border-radius: 50%; background-color: white; box-shadow: 0 0 15px 2px rgba(255, 255, 255, 0.8); opacity: 0.5; animation: pulse 2.5s infinite ease-in-out 0.7s;"></div>
              
              <!-- Logo with glow effect -->
              <div style="position: relative; display: inline-block; margin-bottom: 20px;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 130%; height: 130%; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%); animation: pulse 3s infinite;"></div>
                <img src="https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png" alt="${STORE_NAME}" width="160" style="position: relative; z-index: 2;">
              </div>
              
              <!-- Animated heading -->
              <h1 class="header-pulse" style="margin: 15px 0 5px; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; position: relative; z-index: 2;">Order Confirmation</h1>
              
              <!-- Divider with shimmer -->
              <div style="position: relative; width: 80px; height: 4px; background: rgba(255, 255, 255, 0.7); margin: 20px auto; overflow: hidden; border-radius: 2px;">
                <div class="shimmer-effect" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
              </div>
              
              <!-- Stylish cursive text -->
              <p class="cursive-text" style="margin: 20px 0 5px; font-size: 28px; color: white; position: relative; z-index: 2;">Thank you for your order!</p>
              
              <!-- Order number -->
              <p style="margin: 10px 0 5px; color: rgba(255, 255, 255, 0.9); font-size: 16px; position: relative; z-index: 2; font-weight: 500;">
                Order #: <span style="font-weight: 600; letter-spacing: 1px;">${orderNumber}</span>
              </p>
              
              <!-- Animated badge -->
              <div style="display: inline-block; margin-top: 15px; background: linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%); padding: 8px 20px; border-radius: 50px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); animation: pulse 2s infinite; position: relative; z-index: 2;">
                <span style="color: #065F46; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  ${status === "processing" ? "Processing" : status === "completed" ? "Completed" : "Confirmed"}
                </span>
              </div>
              
              <!-- Progress bar for order status -->
              <div style="width: 80%; max-width: 300px; height: 6px; background-color: rgba(255, 255, 255, 0.2); border-radius: 3px; margin: 25px auto 5px; position: relative; z-index: 2; overflow: hidden;">
                <div class="progress-animation" style="height: 100%; background: linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,1) 100%); width: ${
                  status === "pending" ? "25%" : 
                  status === "processing" ? "50%" : 
                  status === "shipped" ? "75%" : 
                  status === "delivered" ? "100%" : "25%"
                }; border-radius: 3px;"></div>
              </div>
              
              <!-- Status text -->
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.8); font-size: 13px; position: relative; z-index: 2;">
                ${
                  status === "pending" ? "Order received, payment confirmation pending" : 
                  status === "processing" ? "Order confirmed, preparing for shipment" : 
                  status === "shipped" ? "Your order is on its way" : 
                  status === "delivered" ? "Your order has been delivered" : "Order received"
                }
              </p>
              
              <!-- Shine effect overlay -->
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%); transform: translateY(100%) rotate(25deg); animation: shimmer 3s infinite; z-index: 1;"></div>
            </td>
          </tr>
          
          <!-- Welcome message -->
          <tr>
            <td class="mobile-padding" style="position: relative; z-index: 1; padding: 40px 30px 25px; background-color: white;">
              <!-- Welcome message -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td>
                    <h2 class="slide-in-right" style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #065F46;">Order Confirmed!</h2>
                    
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; color: #4B5563;">
                      We're thrilled to confirm your order has been received and is being prepared with care. Your journey to a healthier lifestyle with our premium millet products has begun!
                    </p>
                    
                    <!-- Order summary card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 30px 0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #E5E7EB;">
                      <!-- Card header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 20px 25px;">
                          <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">Order Summary</h3>
                        </td>
                      </tr>
                      
                      <!-- Card body -->
                      <tr>
                        <td style="padding: 25px; background-color: white;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                            <tr>
                              <td width="50%" class="mobile-stack" valign="top" style="padding-bottom: 15px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                        <tr>
                                          <td width="24" valign="top">
                                            <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #FEF3C7 0%, #FEF9C3 100%); display: flex; align-items: center; justify-content: center; font-size: 16px; text-align: center;">
                                              🧾
                                            </div>
                                          </td>
                                          <td style="padding-left: 10px;">
                                            <p style="margin: 0; font-size: 14px; color: #6B7280;">Order Number</p>
                                            <p style="margin: 5px 0 0; font-weight: 600; color: #111827;">${orderNumber}</p>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                        <tr>
                                          <td width="24" valign="top">
                                            <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%); display: flex; align-items: center; justify-content: center; font-size: 16px; text-align: center;">
                                              📅
                                            </div>
                                          </td>
                                          <td style="padding-left: 10px;">
                                            <p style="margin: 0; font-size: 14px; color: #6B7280;">Order Date</p>
                                            <p style="margin: 5px 0 0; font-weight: 600; color: #111827;">${new Date(order.createdAt || new Date()).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td width="50%" class="mobile-stack" valign="top" style="padding-bottom: 15px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                        <tr>
                                          <td width="24" valign="top">
                                            <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%); display: flex; align-items: center; justify-content: center; font-size: 16px; text-align: center;">
                                              ⏱️
                                            </div>
                                          </td>
                                          <td style="padding-left: 10px;">
                                            <p style="margin: 0; font-size: 14px; color: #6B7280;">Order Status</p>
                                            <p style="margin: 5px 0 0;">
                                              <span style="display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background-color: ${
                                                status === "pending" ? "#FEF3C7" :
                                                status === "processing" ? "#DBEAFE" :
                                                status === "completed" ? "#D1FAE5" :
                                                status === "failed" ? "#FEE2E2" :
                                                status === "cancelled" ? "#E5E7EB" : "#f9f9f9"
                                              }; color: ${
                                                status === "pending" ? "#92400E" :
                                                status === "processing" ? "#1E40AF" :
                                                status === "completed" ? "#065F46" :
                                                status === "failed" ? "#B91C1C" :
                                                status === "cancelled" ? "#374151" : "#111827"
                                              };">${status.toUpperCase()}</span>
                                            </p>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                        <tr>
                                          <td width="24" valign="top">
                                            <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); display: flex; align-items: center; justify-content: center; font-size: 16px; text-align: center;">
                                              💳
                                            </div>
                                          </td>
                                          <td style="padding-left: 10px;">
                                            <p style="margin: 0; font-size: 14px; color: #6B7280;">Payment Method</p>
                                            <p style="margin: 5px 0 0; font-weight: 600; color: #111827;">${
                                              paymentMethod === "razorpay" ? "Razorpay" :
                                              paymentMethod === "phonepay" ? "PhonePe" :
                                              paymentMethod === "cod" ? "Cash on Delivery" :
                                              paymentMethod === "bank_transfer" ? "Bank Transfer" : paymentMethod
                                            }</p>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Expected delivery -->
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top: 20px; background-color: #F0FDF4; border-radius: 12px;">
                            <tr>
                              <td style="padding: 15px 20px; border-left: 4px solid #10B981;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                  <tr>
                                    <td width="30" valign="middle">
                                      <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%); display: flex; align-items: center; justify-content: center; font-size: 16px; text-align: center;">
                                        🚚
                                      </div>
                                    </td>
                                    <td style="padding-left: 10px;">
                                      <p style="margin: 0; font-size: 15px; color: #065F46; font-weight: 600;">Estimated Delivery</p>
                                      <p style="margin: 5px 0 0; color: #6B7280; font-size: 14px;">Expected to arrive by <strong>${estimatedDeliveryDate}</strong></p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Special greeting -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 30px 0; text-align: center;">
                      <tr>
                        <td>
                          <p class="cursive-text" style="margin: 0; font-size: 24px; color: #059669;">Embrace the Goodness of Millets!</p>
                          <p style="margin: 10px 0 0; color: #6B7280; font-size: 15px;">Thank you for choosing our premium millet products for your health journey.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Order details section -->
          <tr>
            <td class="mobile-order-details" style="position: relative; z-index: 1; padding: 0 30px 40px; background-color: white;">
              <!-- Order details heading with icon -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom: 25px;">
                <tr>
                  <td width="30" valign="middle">
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%); display: flex; align-items: center; justify-content: center; font-size: 18px; text-align: center;">
                      📋
                    </div>
                  </td>
                  <td style="padding-left: 15px;">
                    <h2 style="margin: 0; color: #111827; font-size: 22px; font-weight: 600;">Order Details</h2>
                  </td>
                </tr>
              </table>
              
              <!-- Items table with premium styling -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #E5E7EB; margin-bottom: 30px;">
                <!-- Table headers -->
                <tr>
                  <th align="left" style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; padding: 15px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                  <th align="center" style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; padding: 15px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                  <th align="right" style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; padding: 15px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                  <th align="right" style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; padding: 15px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                </tr>
                
                <!-- Table body -->
                ${itemsHtml}
                
                <!-- Table footer with order summary -->
                <tr>
                  <td colspan="4" style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      <tr>
                        <td align="right">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-left: auto;">
                            <tr>
                              <td style="padding: 8px 0; color: #6B7280; font-size: 15px; text-align: right; width: 150px;">Subtotal:</td>
                              <td style="padding: 8px 0; color: #4B5563; font-weight: 500; text-align: right; width: 100px;">₹${parseFloat(subtotalAmount.toString()).toFixed(2)}</td>
                            </tr>
                            ${discountAmount && parseFloat(discountAmount.toString()) > 0 ? `
                            <tr>
                              <td style="padding: 8px 0; color: #6B7280; font-size: 15px; text-align: right;">Discount:</td>
                              <td style="padding: 8px 0; color: #DC2626; font-weight: 500; text-align: right;">-₹${parseFloat(discountAmount.toString()).toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="padding: 8px 0; color: #6B7280; font-size: 15px; text-align: right;">Shipping:</td>
                              <td style="padding: 8px 0; color: #4B5563; font-weight: 500; text-align: right;">₹${parseFloat(shippingAmount.toString()).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #6B7280; font-size: 15px; text-align: right;">Tax:</td>
                              <td style="padding: 8px 0; color: #4B5563; font-weight: 500; text-align: right;">₹${parseFloat(taxAmount.toString()).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding-top: 10px;">
                                <div style="height: 1px; background: linear-gradient(90deg, transparent, #E5E7EB, transparent);"></div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 15px 0 8px; color: #111827; font-size: 16px; font-weight: 600; text-align: right;">Total:</td>
                              <td style="padding: 15px 0 8px; font-size: 16px; color: #065F46; font-weight: 700; text-align: right;">₹${parseFloat(totalAmount.toString()).toFixed(2)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Shipping information section -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom: 30px;">
                <tr>
                  <td>
                    <!-- Section heading -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom: 20px;">
                      <tr>
                        <td width="30" valign="middle">
                          <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%); display: flex; align-items: center; justify-content: center; font-size: 18px; text-align: center;">
                            📍
                          </div>
                        </td>
                        <td style="padding-left: 15px;">
                          <h2 style="margin: 0; color: #111827; font-size: 22px; font-weight: 600;">Shipping Information</h2>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Shipping details card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background: linear-gradient(165deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #d1fae5;">
                      <tr>
                        <td style="padding: 25px; position: relative;">
                          <!-- No decorative element needed -->
                          
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                            <tr>
                              <td>
                                <p style="margin: 0 0 5px; font-weight: 600; color: #065F46; font-size: 16px;">Shipping Address:</p>
                                <p style="margin: 0 0 20px; color: #374151; line-height: 1.5;">${shippingAddress || "Address not provided"}</p>
                                
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                  <tr>
                                    <td width="24" valign="top">
                                      <div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%); display: flex; align-items: center; justify-content: center; font-size: 14px; text-align: center;">
                                        ℹ️
                                      </div>
                                    </td>
                                    <td style="padding-left: 10px;">
                                      <p style="margin: 0; color: #6B7280; font-size: 14px; font-style: italic;">Your order will be processed and shipped within 1-2 business days. You'll receive another email with tracking information once your order has been shipped.</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Health benefits section -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 30px 0; background-color: #F9FAFB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 15px; color: #065F46; font-size: 18px; font-weight: 600; text-align: center;">Benefits of Millets</h3>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      <tr>
                        <td width="33.33%" class="mobile-stack" valign="top" style="padding: 10px; text-align: center;">
                          <div style="width: 50px; height: 50px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #059669; font-size: 24px;">❤️</div>
                          <p style="margin: 0 0 5px; color: #111827; font-weight: 600; font-size: 15px;">Heart Healthy</p>
                          <p style="margin: 0; color: #6B7280; font-size: 13px;">Rich in magnesium and potassium that support heart health.</p>
                        </td>
                        <td width="33.33%" class="mobile-stack" valign="top" style="padding: 10px; text-align: center;">
                          <div style="width: 50px; height: 50px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #059669; font-size: 24px;">🌾</div>
                          <p style="margin: 0 0 5px; color: #111827; font-weight: 600; font-size: 15px;">Gluten-Free</p>
                          <p style="margin: 0; color: #6B7280; font-size: 13px;">Natural alternative for those with gluten sensitivities.</p>
                        </td>
                        <td width="33.33%" class="mobile-stack" valign="top" style="padding: 10px; text-align: center;">
                          <div style="width: 50px; height: 50px; background-color: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #059669; font-size: 24px;">🌱</div>
                          <p style="margin: 0 0 5px; color: #111827; font-weight: 600; font-size: 15px;">High Fiber</p>
                          <p style="margin: 0; color: #6B7280; font-size: 13px;">Promotes better digestion and sustained energy levels.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Customer support section -->
          <tr>
            <td style="position: relative; z-index: 1; padding: 30px; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-top: 1px solid #E5E7EB;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <h3 style="margin: 0 0 10px; color: #111827; font-size: 20px; font-weight: 600;">Need Assistance?</h3>
                    <p style="margin: 0; color: #6B7280; font-size: 15px;">We're here to help with any questions about your order.</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      <tr>
                        <td width="50%" class="mobile-stack" valign="top" style="padding: 10px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); height: 100%;">
                            <tr>
                              <td style="padding: 20px; text-align: center;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #059669; font-size: 24px;">
                                  ✉
                                </div>
                                <h4 style="margin: 0 0 10px; color: #111827; font-size: 16px; font-weight: 600;">Email Support</h4>
                                <p style="margin: 0 0 15px; color: #6B7280; font-size: 14px;">Questions about your order? Our team is here to help.</p>
                                <a href="mailto:support@millikit.com" style="color: #059669; text-decoration: none; font-weight: 500; display: block;">support@millikit.com</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" class="mobile-stack" valign="top" style="padding: 10px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); height: 100%;">
                            <tr>
                              <td style="padding: 20px; text-align: center;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #059669; font-size: 24px;">
                                  📞
                                </div>
                                <h4 style="margin: 0 0 10px; color: #111827; font-size: 16px; font-weight: 600;">Phone Support</h4>
                                <p style="margin: 0 0 15px; color: #6B7280; font-size: 14px;">Need immediate assistance? Call our support line.</p>
                                <a href="tel:+917548871552" style="color: #059669; text-decoration: none; font-weight: 500; display: block;">+91 7548871552</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="position: relative; z-index: 1; background-color: #111827; color: white; padding: 40px 30px; text-align: center; border-radius: 0 0 16px 16px;">
              <!-- Millet decorative pattern -->
              <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 70px; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDcwIiBmaWxsPSJub25lIj48cGF0aCBkPSJNMCw3MCBDMjQwLDQwIDQ4MCwwIDcyMCwwIEM5NjAsMCAxMjAwLDQwIDE0NDAsNzAgTDE0NDAsNzAgTDAsNzAgWiIgZmlsbD0iIzA2NUY0NiIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+'); background-position: bottom; background-repeat: no-repeat; opacity: 0.5;"></div>
              
              <img src="https://i.postimg.cc/Zq2Q30cv/LOGO-removebg-preview.png" alt="${STORE_NAME}" width="120" style="margin-bottom: 20px;">
              
              <p class="cursive-text" style="margin: 0 0 20px; color: #10B981; font-size: 24px;">Premium Millet Products for a Healthier Lifestyle</p>
              
              <!-- Social links -->
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 20px auto;">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #065F46; border-radius: 50%; color: white; text-align: center; line-height: 36px; text-decoration: none; font-weight: bold;">f</a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #065F46; border-radius: 50%; color: white; text-align: center; line-height: 36px; text-decoration: none; font-weight: bold;">i</a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #065F46; border-radius: 50%; color: white; text-align: center; line-height: 36px; text-decoration: none; font-weight: bold;">t</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 5px; color: #9CA3AF; font-size: 14px;">&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
              <p style="margin: 5px 0 0; color: #6B7280; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return await sendEmail(
      email,
      `Your Order Confirmation #${orderNumber} - ${STORE_NAME}`,
      html
    );
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};