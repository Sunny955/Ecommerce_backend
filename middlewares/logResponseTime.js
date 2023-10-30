const fs = require("fs");
const nodemailer = require("nodemailer");

const MAX_FILE_SIZE_MB = 100;

const logResponseTime = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;

    if (elapsedTimeInMs > 5000) {
      const log = `API took ${elapsedTimeInMs}ms to respond. Route: ${
        req.method
      } ${req.originalUrl} at ${new Date().toISOString()}\n`;

      fs.appendFile("response_times.log", log, (err) => {
        if (err) console.error("Error logging response time:", err);

        // Check file size
        const stats = fs.statSync("response_times.log");
        const fileSizeInMB = stats["size"] / (1024 * 1024);

        if (fileSizeInMB > MAX_FILE_SIZE_MB) {
          sendEmailAndClearLog();
        }
      });
    }
  });

  next();
};

const sendEmailAndClearLog = () => {
  // Set up transporter
  const transporter = nodemailer.createTransport({
    service: "gmail", // example for Gmail, adjust for your own mail service
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MAIL_PASS,
    },
  });

  // Set up mail options
  const mailOptions = {
    from: '"Hey! 👤" <botarmy@gmail.com>',
    to: "amiyaranjan9050@gmail.com",
    subject: "Response times log file",
    text: "Attached is the log file for response times",
    attachments: [
      {
        filename: "response_times.log",
        path: "../response_times.log", // path to the log file
      },
    ],
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);

      // Clear the log file
      fs.writeFileSync("response_times.log", "");
    }
  });
};

module.exports = logResponseTime;
