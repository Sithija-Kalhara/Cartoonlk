const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// authController.js eke thiyena "transporter.sendMail(...)" call ekama
// wenas karanna one na - meka compatible wrapper ekak, nodemailer ekema
// shape ekama return karanawa (messageId, accepted, rejected, response).
const transporter = {
  sendMail: async ({ from, to, subject, html }) => {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(
        `Resend error: ${error.message || JSON.stringify(error)}`
      );
    }

    return {
      messageId: data.id,
      accepted: [to],
      rejected: [],
      response: "sent via Resend API",
    };
  },
};

if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY missing from environment variables!");
} else {
  console.log("✅ Resend mailer ready (HTTPS API - no SMTP ports needed)");
}

module.exports = transporter;