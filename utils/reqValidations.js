const NAME_VALIDATION_PATTERN = /^[a-zA-Z\s]*$/;
const EMAIL_VALIDATION_PATTERN = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
const MOBILE_VALIDATION_PATTERN = /^\d{10}$/;

function isValidName(name) {
    return NAME_VALIDATION_PATTERN.test(name);
}

function isValidEmail(email) {
    return EMAIL_VALIDATION_PATTERN.test(email);
}

function isValidMobile(mobile) {
    return MOBILE_VALIDATION_PATTERN.test(mobile);
}

module.exports = {isValidEmail,isValidMobile,isValidName};