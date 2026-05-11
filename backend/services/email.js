const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Alert email when bin is full ──────────────────────────────
async function sendEmailAlert(binId, fullness) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email not configured — skipping alert email');
    return;
  }
  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      process.env.ALERT_RECIPIENT || process.env.EMAIL_USER,
      subject: `🚨 MedWaste Alert — Container ${binId} is ${fullness}% full`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#E53E3E">🚨 Container Alert</h2>
          <p>Container <strong>${binId}</strong> has reached <strong>${fullness}%</strong> capacity.</p>
          <p>Immediate collection is required.</p>
          <hr/>
          <p style="color:#888;font-size:12px">MedWaste Monitoring System</p>
        </div>
      `,
    });
    console.log(`📧 Alert email sent for ${binId}`);
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
  }
}

// ── Task assignment email to driver ───────────────────────────
async function sendTaskAssignedEmail(driverEmail, driverName, containerId, location, fullness) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email not configured — skipping task email');
    return;
  }
  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      driverEmail,
      subject: `🚛 New Task Assigned — Container ${containerId}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#1A6EFF">🚛 New Collection Task</h2>
          <p>Hello <strong>${driverName}</strong>,</p>
          <p>You have been assigned a new medical waste collection task.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f0f4f8">
              <td style="padding:8px 12px;font-weight:600">Container</td>
              <td style="padding:8px 12px">${containerId}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:600">Location</td>
              <td style="padding:8px 12px">${location || 'See map'}</td>
            </tr>
            <tr style="background:#f0f4f8">
              <td style="padding:8px 12px;font-weight:600">Fullness</td>
              <td style="padding:8px 12px;color:#E53E3E"><strong>${fullness}%</strong></td>
            </tr>
          </table>
          <p>Please collect the waste as soon as possible.</p>
          <a href="http://localhost:5173/dashboard/driver-dashboard"
             style="display:inline-block;background:#1A6EFF;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
            Open Dashboard →
          </a>
          <hr style="margin-top:24px"/>
          <p style="color:#888;font-size:12px">MedWaste Monitoring System</p>
        </div>
      `,
    });
    console.log(`📧 Task email sent to ${driverEmail}`);
  } catch (err) {
    console.error('❌ Task email failed:', err.message);
  }
}

module.exports = { sendEmailAlert, sendTaskAssignedEmail };