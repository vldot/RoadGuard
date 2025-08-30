const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text, html) => {
  try {
    // Gmail SMTP settings
    let transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"RoadGuard System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};

module.exports = sendEmail;
