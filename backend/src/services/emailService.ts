import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

// Register Handlebars helpers
Handlebars.registerHelper('multiply', function(a: number, b: number) {
  return (a * b).toFixed(2);
});

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error.message);
    console.log('⚠️  Emails will not be sent. Check your email configuration in .env');
  } else {
    console.log('✅ Email service is ready to send messages');
  }
});

/**
 * Load and compile email template
 */
const loadTemplate = (templateName: string): HandlebarsTemplateDelegate => {
  const templatePath = path.join(
    __dirname,
    '../templates',
    `${templateName}.hbs`
  );
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  return Handlebars.compile(templateSource);
};

/**
 * Send email using template
 */
export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  data: Record<string, any>
): Promise<void> => {
  try {
    const template = loadTemplate(templateName);
    const html = template(data);

    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 Email sent to ${to}: ${info.messageId}`);

    // Log preview URL for Ethereal Email (dev environment)
    if (config.nodeEnv === 'development' && config.email.host.includes('ethereal')) {
      console.log(`📨 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (
  email: string,
  orderData: {
    orderNumber: string;
    customerName: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    total: number;
    shippingAddress: any;
  }
): Promise<void> => {
  await sendEmail(
    email,
    `Order Confirmation #${orderData.orderNumber}`,
    'order-confirmation',
    { ...orderData, frontendUrl: config.app.frontendUrl }
  );
};

/**
 * Send email verification email
 */
export const sendVerificationEmail = async (
  email: string,
  data: {
    userName: string;
    verificationUrl: string;
  }
): Promise<void> => {
  await sendEmail(
    email,
    'Verify Your Email Address',
    'email-verification',
    data
  );
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  data: {
    userName: string;
    resetUrl: string;
  }
): Promise<void> => {
  await sendEmail(
    email,
    'Reset Your Password',
    'password-reset',
    data
  );
};

/**
 * Send order shipped email
 */
export const sendOrderShippedEmail = async (
  email: string,
  orderData: {
    orderNumber: string;
    customerName: string;
    trackingNumber: string;
    trackingUrl?: string;
  }
): Promise<void> => {
  await sendEmail(
    email,
    `Your Order #${orderData.orderNumber} Has Shipped`,
    'order-shipped',
    orderData
  );
};

/**
 * Send order delivered email
 */
export const sendOrderDeliveredEmail = async (
  email: string,
  orderData: {
    orderNumber: string;
    customerName: string;
  }
): Promise<void> => {
  await sendEmail(
    email,
    `Your Order #${orderData.orderNumber} Has Been Delivered`,
    'order-delivered',
    { ...orderData, frontendUrl: config.app.frontendUrl }
  );
};

/**
 * Send password changed confirmation email
 */
export const sendPasswordChangedEmail = async (
  email: string,
  data: {
    userName: string;
  }
): Promise<void> => {
  await sendEmail(
    email,
    'Your Password Has Been Changed',
    'password-changed',
    data
  );
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
};

export default transporter;
