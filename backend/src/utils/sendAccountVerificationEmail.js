const sendEmail = require("./emailSender");

const sendAccountVerificationEmail = async (to, otp) => {
  const subject = "Verify Your Account";
  const text = `Your OTP for verifying your account is ${otp}. It is valid for 10 minutes.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Poppins', Arial, sans-serif; 
      background-color: #f4f4f4; 
      margin: 0; 
      padding: 20px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
    }
    .container { 
      max-width: 600px; 
      margin: auto; 
      background-color: #ffffff; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); 
    }
    .header { 
      background-color: #16A34A; 
      text-align: center; 
      padding: 30px; 
      border-bottom: 2px solid #15803D; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: 600; 
      color: #FFFFFF; 
    }
    .content { 
      padding: 40px 20px; 
      text-align: center; 
    }
    .content h2 { 
      font-size: 24px; 
      font-weight: 600; 
      color: #333; 
      margin: 0 0 20px 0; 
    }
    .content p { 
      font-size: 16px; 
      line-height: 1.5; 
      color: #666; 
      margin: 0 0 20px 0; 
    }
    .otp { 
      font-size: 40px; 
      font-weight: 600; 
      color: #164A3A; 
      margin: 20px 0; 
    }
    .footer { 
      background-color: #f4f4f4; 
      text-align: center; 
      padding: 20px; 
      font-size: 14px; 
      color: #888888; 
      border-top: 2px solid #e0e0e0; 
    }
    .footer p { 
      margin: 0; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ACCOUNT VERIFICATION</h1>
    </div>
    <div class="content">
      <h2>Account Verification OTP</h2>
      <p>Dear User,</p>
      <p>Welcome to our platform! Please use the following OTP to verify your account:</p>
      <div class="otp">${otp}</div>
      <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
      <p>Best Regards,<br>The Support Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} RoadGuard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail(to, subject, text, html);
};

module.exports = sendAccountVerificationEmail;
