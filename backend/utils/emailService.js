const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Create transporter
const createTransporter = () => {
  console.log('📧 Creating email transporter...');
  console.log('📧 Email User:', process.env.EMAIL_USER);
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'felicity.events.iiith@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// Generate QR Code as data URL
const generateQRCode = async (ticketId, eventName, userName) => {
  const qrData = JSON.stringify({
    ticketId,
    event: eventName,
    participant: userName
  });
  return await QRCode.toDataURL(qrData);
};

// Send registration confirmation email
const sendRegistrationEmail = async (user, event, registration) => {
  try {
    console.log('📧 Attempting to send email to:', user.email);
    const transporter = createTransporter();
    
    // Verify connection
    await transporter.verify();
    console.log('📧 SMTP connection verified');
    
    // Generate QR Code
    const qrCodeDataUrl = await generateQRCode(
      registration.ticketId,
      event.name,
      `${user.firstName} ${user.lastName}`
    );

    const mailOptions = {
      from: process.env.EMAIL_USER || 'felicity.events.iiith@gmail.com',
      to: user.email,
      subject: `Registration Confirmed: ${event.name} - Ticket #${registration.ticketId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Registration Confirmed! 🎉</h2>
          
          <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
          
          <p>Your registration for <strong>${event.name}</strong> has been confirmed.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Ticket Details</h3>
            <p><strong>Ticket ID:</strong> ${registration.ticketId}</p>
            <p><strong>Event:</strong> ${event.name}</p>
            <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
            ${event.registrationFee > 0 ? `<p><strong>Fee Paid:</strong> ₹${event.registrationFee}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p><strong>Your Entry QR Code:</strong></p>
            <img src="${qrCodeDataUrl}" alt="Entry QR Code" style="max-width: 200px; border: 2px solid #333;"/>
            <p style="font-size: 12px; color: #666;">Save this QR code for event entry</p>
          </div>
          
          <p>Please present this ticket (print or digital) at the event venue.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            This is an automated email from Felicity Event Management System.<br>
            Please do not reply to this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(' Email sent successfully! Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('🔑 Authentication failed! You need an App Password, not your regular Gmail password.');
      console.error('🔑 Go to Google Account → Security → App Passwords to generate one.');
    }
    return false;
  }
};

// Send merchandise payment approval email
const sendPaymentApprovalEmail = async (user, event, registration, approved) => {
  try {
    const transporter = createTransporter();
    
    let qrCodeDataUrl = null;
    if (approved) {
      qrCodeDataUrl = await generateQRCode(
        registration.ticketId,
        event.name,
        `${user.firstName} ${user.lastName}`
      );
    }

    const mailOptions = approved ? {
      from: process.env.EMAIL_USER || 'felicity.events.iiith@gmail.com',
      to: user.email,
      subject: `Payment Approved: ${event.name} - Ticket #${registration.ticketId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Payment Approved! </h2>
          
          <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
          
          <p>Your payment for <strong>${event.name}</strong> has been approved.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order ID:</strong> ${registration.ticketId}</p>
            <p><strong>Event:</strong> ${event.name}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p><strong>Your Entry QR Code:</strong></p>
            <img src="${qrCodeDataUrl}" alt="Entry QR Code" style="max-width: 200px; border: 2px solid #333;"/>
            <p style="font-size: 12px; color: #666;">Save this QR code for event entry</p>
          </div>
        </div>
      `
    } : {
      from: process.env.EMAIL_USER || 'felicity.events.iiith@gmail.com',
      to: user.email,
      subject: `Payment Rejected: ${event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Payment Rejected ❌</h2>
          
          <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
          
          <p>Unfortunately, your payment for <strong>${event.name}</strong> has been rejected.</p>
          
          <p>Please contact the event organizer for more details.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    return false;
  }
};

module.exports = {
  sendRegistrationEmail,
  sendPaymentApprovalEmail,
  generateQRCode
};

