const NAME_VALIDATION_PATTERN = /^[a-zA-Z\s]*$/;
const EMAIL_VALIDATION_PATTERN = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
const MOBILE_VALIDATION_PATTERN = /^\d{10}$/;
const mongoose = require("mongoose");

function isValidName(name) {
  return NAME_VALIDATION_PATTERN.test(name);
}

function isValidEmail(email) {
  return EMAIL_VALIDATION_PATTERN.test(email);
}

function isValidMobile(mobile) {
  return MOBILE_VALIDATION_PATTERN.test(mobile);
}

const validateMongoDbId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const validateStatus = (status, validStatuses) => {
  const formattedStatus = status.toLowerCase();
  if (!validStatuses.includes(formattedStatus)) {
    return false;
  }
  return formattedStatus
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

module.exports = {
  isValidEmail,
  isValidMobile,
  isValidName,
  validateMongoDbId,
  validateStatus,
};
