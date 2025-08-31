const sendEmail = require("./emailSender");

const sendServiceRequestEmail = async (workshopAdminEmail, serviceRequest) => {
  const subject = ` New Service Request - ${serviceRequest.issueType} (${serviceRequest.urgency} Priority)`;
  const text = `You have a new service request assigned to your workshop:\n\n` +
    `Request ID: ${serviceRequest.id}\n` +
    `Customer: ${serviceRequest.customer.name}\n` +
    `Phone: ${serviceRequest.customer.phone || 'Not provided'}\n` +
    `Vehicle: ${serviceRequest.vehicleType} ${serviceRequest.vehicleMake || ''} ${serviceRequest.vehicleModel || ''}\n` +
    `Issue Type: ${serviceRequest.issueType}\n` +
    `Priority: ${serviceRequest.urgency}\n` +
    `Location: ${serviceRequest.pickupAddress}\n` +
    `Description: ${serviceRequest.description}`;

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
      background-color: #1d4ed8;
      text-align: center;
      padding: 30px;
      border-bottom: 2px solid #1e40af;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .content {
      padding: 40px 20px;
      text-align: left;
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
      <h1>🔧 New Service Request</h1>
    </div>
    <div class="content">
      <h2>Service Request Details</h2>
      <p><strong>Request ID:</strong> ${serviceRequest.id}</p>
      <p><strong>Customer:</strong> ${serviceRequest.customer.name}</p>
      <p><strong>Phone:</strong> ${serviceRequest.customer.phone || 'Not provided'}</p>
      <p><strong>Vehicle:</strong> ${serviceRequest.vehicleType} ${serviceRequest.vehicleMake || ''} ${serviceRequest.vehicleModel || ''}</p>
      <p><strong>Issue Type:</strong> ${serviceRequest.issueType}</p>
      <p><strong>Priority:</strong> ${serviceRequest.urgency}</p>
      <p><strong>Location:</strong> ${serviceRequest.pickupAddress}</p>
      <p><strong>Description:</strong></p>
      <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-style: italic;">"${serviceRequest.description}"</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} RoadGuard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail(workshopAdminEmail, subject, text, html);
};

module.exports = sendServiceRequestEmail;