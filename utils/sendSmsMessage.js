const AWS = require("aws-sdk");
const sns = new AWS.SNS();

const message = (id, amount) => {
  return `Dear User, your order has been placed successfully. Order ID: ${id}, Amount: ${amount} INR. Thank you for shopping with us!`;
};

const sendSMSNotification = async (to, message) => {
  try {
    const params = {
      Message: message,
      PhoneNumber: to,
    };

    await sns.publish(params).promise();

    console.log(`SMS sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending SMS: ${error.message}`);
  }
};

module.exports = { sendSMSNotification, message };
