const { generateToken } = require("../config/jwtToken");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const {
  isValidEmail,
  isValidName,
  isValidMobile,
  validateMongoDbId,
} = require("../utils/reqValidations");
const { generateRefreshToken } = require("../config/refreshToken");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../controller/EmailController");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { cache } = require("../middlewares/cacheMiddleware");
const { validateAddressWithMapQuest } = require("../utils/authAddress");

/**
 * @route POST /api/user/register
 * @description Creates a new user in the system. The function expects the 'email' field to be unique.
 * It will check if the user already exists based on the provided email, and if not, it will create
 * the user with the provided data. More comprehensive input validation should be applied, either
 * within this function or using a middleware.
 * @param {Object} req - Express request object. Expected to contain user details with 'email' as a mandatory field.
 * @param {Object} res - Express response object. Returns the newly created user details or an appropriate error message.
 * @throws {Error} Possible errors include missing email field, user already exists, database errors, or other internal issues.
 * @returns {Object} JSON response with the created user details or an error message.
 */
const createUser = asyncHandler(async (req, res) => {
  // Destructure email from request body
  const { email, ...otherData } = req.body;

  // Ideally, you should have more comprehensive input validation here or middleware to validate input
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    // Create a new user
    const newUser = await User.create({ email, ...otherData });

    // Invalidate the cache for all users
    const allUsersKey = "/api/user/all-users";
    cache.del(allUsersKey);

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    // Ideally, we should send the error to a logger and provide a generic error message to the client.
    console.error(`Failed to create user: ${error.message}`);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
});

/**
 * @route POST /api/user/login
 * @description Authenticates the user and logs them in. The function expects email and password
 * in the request body. Upon successful authentication, it generates a refresh token for the user
 * and updates their record in the database with this token. It then sends back the user details
 * along with an authentication token.
 * @param {Object} req - Express request object. Expected to contain 'email' and 'password' in the body.
 * @param {Object} res - Express response object. Returns the user details and authentication token
 * or an appropriate error message.
 * @throws {Error} Possible errors include missing email or password, invalid MongoDB ID format,
 * or incorrect email/password combination.
 */
const loginUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Check for email and password presence
  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "Email and password required for login",
    });
  }
  const findUser = await User.findOne({ email: email });

  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateuser = await User.findByIdAndUpdate(
      findUser._id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 168 * 60 * 60 * 1000,
    });
    res.status(200).json({
      success: true,
      user: {
        id: findUser._id,
        email: findUser.email,
        firstname: findUser.firstname,
        lastname: findUser.lastname,
        mobile: findUser.mobile,
        token: generateToken(findUser._id),
      },
    });
  } else {
    console.log("Error while login user");
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

/**
 * @route POST /api/user/admin-login
 * @description Authenticates an admin user and provides them with a JWT token and a refresh token.
 * The function checks the email and password from the request body against the database. If authenticated,
 * the function will return some user details and a JWT token. If the user is not an admin or if authentication fails,
 * it will throw an error.
 * @param {Object} req - Express request object. Expected to have email and password in the body.
 * @param {Object} res - Express response object. Sets a refreshToken cookie and returns user details and a JWT token.
 * @throws {Error} Possible errors include non-admin users, invalid credentials, and other authentication failures.
 * @returns {Object} JSON response with user details, a JWT token, or an error message.
 */
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. check email and password provided
  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "Email and password required for login",
    });
  }

  // 2. Find the user based on the provided email
  const user = await User.findOne({ email });

  // 3. Check if user exists and if it's an admin
  if (!user) {
    return res
      .status(401)
      .json({ success: false, messsage: "Invalid credentials" });
  }
  if (user.role !== "admin" && user.role !== "Admin") {
    return res
      .status(402)
      .json({ success: false, message: "Not authorized/admin" });
  }

  // 4. Verify the password
  const isPasswordValid = await user.isPasswordMatched(password);
  if (!isPasswordValid) {
    throw new Error("Invalid Credentials");
  }

  // 5. Generate a new refresh token for the user
  const refreshToken = await generateRefreshToken(user._id);

  // 6. Update the user's refresh token in the database
  await User.findByIdAndUpdate(user._id, { refreshToken }, { new: true });

  // 7. Send the refresh token as a cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000, // 3 days
  });

  // 8. Respond with user details and a JWT token
  res.json({
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    mobile: user.mobile,
    token: generateToken(user._id),
  });
});

/**
 * @route GET /api/user/logout
 * @description Logs out the user from the system by clearing the refreshToken from both the database and the client-side cookies.
 * The function expects a refreshToken stored in the client-side cookies, which will be used to identify the user in the system.
 * The function will throw an error if the refreshToken is missing. After successfully logging out, a success message will be returned.
 * @param {Object} req - Express request object. Expected to have the refreshToken in the cookies.
 * @param {Object} res - Express response object. Clears the refreshToken cookie and returns a logout success message.
 * @throws {Error} Possible errors include missing refreshToken in cookies.
 * @returns {Object} JSON response with a success message or an error message.
 */
const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new Error("No Refresh Token in Cookies");
  }

  // Update the refreshToken field for the matched user
  await User.findOneAndUpdate(
    { refreshToken },
    {
      refreshToken: "",
    }
  );

  // Clear the refreshToken cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });

  // Respond with 'No Content' status
  res.status(200).json({ message: "Logged out successfully" });
});

/**
 * @route GET /api/user/all-users
 * @description Retrieves a list of users from the system, with optional query parameters to limit the number of results and skip a certain number of entries. By default, the function will retrieve 10 users starting from the first entry. The `limit` and `skip` query parameters can be used to modify this behavior. The response will contain a success flag, the count of retrieved users, and the list of users.
 * @param {Object} req - Express request object. Optionally, may contain `limit` and `skip` in the query parameters.
 * @param {Object} res - Express response object. Returns a list of users and related data or an appropriate error message.
 * @throws {Error} Possible errors include any issues while querying the database or other internal issues.
 * @returns {Object} JSON response with a success flag, count of retrieved users, and the list of users or an error message.
 */
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await req.advancedFilter;

    res.status(200).json({
      success: true,
      pagination: req.advancedFilter.pagination,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500); // Internal Server Error
    throw new Error("Error retrieving users: " + error.message);
  }
});

/**
 * @route GET /api/user/:id
 * @description Retrieves a specific user from the system based on the provided user ID in the route parameters.
 * The function will first validate the format of the MongoDB ID, and if it's incorrect, a relevant error message is returned.
 * If the user does not exist in the system, an appropriate "not found" message will be sent back to the client.
 * @param {Object} req - Express request object. Expected to contain the user ID in the route parameters.
 * @param {Object} res - Express response object. Returns the user's details if found, or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, user not found, database errors, or other internal issues.
 * @returns {Object} JSON response with a success flag, the user's details (if found), or an error message.
 */
const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res.status(400).json({
      message: "Provided ID is not a valid MongoDB ID.",
    });
  }

  try {
    const user = await User.findById(id).populate(
      "wishlist",
      "-createdAt -updatedAt -__v -quantity"
    );
    if (!user) {
      return res.status(404).json({
        message: "User not found with the provided ID.",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving user: " + error.message,
    });
  }
});

/**
 * @route DELETE /api/user/delete-user
 * @description Deletes a specific user from the system based on the provided user ID found in the authenticated user's data (from middleware, JWT, or sessions).
 * The function will first validate the MongoDB ID format, and if it's incorrect, a relevant error message is returned.
 * If the user does not exist in the system, an appropriate "not found" message will be sent back to the client.
 * @param {Object} req - Express request object. Expected to have user information populated by previous middleware, specifically the user ID in the user object.
 * @param {Object} res - Express response object. Returns a success message and details of the deleted user if found, or an appropriate error message.
 * @param {Function} next - Express next middleware function.
 * @throws {Error} Possible errors include invalid MongoDB ID format, user not found, database errors, or other internal issues.
 * @returns {Object} JSON response with a success message, details of the deleted user (if found), or an error message.
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;

  // Ensure the provided ID is a valid MongoDB ObjectID.
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  try {
    const deletedUser = await User.findByIdAndDelete(_id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Invalidate the cache for the specific user
    const userKey = `/api/user/${_id}`;
    cache.del(userKey);

    res.status(200).json({
      success: true,
      data: deletedUser,
      message: "User successfully deleted.",
    });
  } catch (error) {
    // Ideally, we should send the error to a logger and provide a generic error message to the client.
    console.error(`Failed to delete user: ${error.message}`);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * @route GET /api/user/refresh
 * @description Handles the refreshing of an access token using a refresh token stored in cookies.
 * The function expects the refresh token in the client-side cookies. If the refresh token is valid and matches a user in the system,
 * a new access token is generated and sent back to the client. Invalid or expired refresh tokens will return an appropriate error message.
 * @param {Object} req - Express request object. Expected to have a refresh token in the cookies.
 * @param {Object} res - Express response object. Returns a new access token if refresh token is valid, or an appropriate error message.
 * @throws {Error} Possible errors include missing refresh token in cookies, invalid or expired refresh token, missing JWT_SECRET, or other internal issues.
 * @returns {Object} JSON response with a new access token or an error message.
 */
const handleRefreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(400).json({ message: "No refresh token in cookies" });
  }

  const user = await User.findOne({ refreshToken });
  if (!user) {
    return res.status(401).json({ message: "Refresh token is invalid" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing in environment");
    return res.status(500).json({ message: "Internal server error" });
  }

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user._id.toString() !== decoded.id) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = generateToken(user._id);
    res.json({ accessToken });
  });
});

/**
 * @route PUT /api/user/edit-user
 * @description Updates a user's details in the system based on the authenticated user's ID and the provided update fields.
 * The function validates the user ID and the format of fields like the firstname, lastname, email, and mobile number.
 * Only valid updates will be processed. If any of the fields have an invalid format, an error message will be generated.
 * @param {Object} req - Express request object. Expected to have user information populated by previous middleware (specifically the user ID),
 * and may contain fields (firstname, lastname, email, mobile) in the body for updates.
 * @param {Object} res - Express response object. Returns the updated user details and a success message or an appropriate error message.
 * @throws {Error} Possible errors include invalid user ID or field formats, user not found, database errors, or other internal issues.
 * @returns {Object} JSON response with updated user details and a success message, or an error message.
 */
const updateUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  let errors = [];

  if (!validateMongoDbId(_id)) {
    errors.push("Invalid user ID.");
  }

  const { firstname, lastname, email, mobile } = req.body;
  if (firstname && !isValidName(firstname)) {
    errors.push("Invalid firstname format.");
  }
  if (lastname && !isValidName(lastname)) {
    errors.push("Invalid lastname format.");
  }
  if (email && !isValidEmail(email)) {
    errors.push("Invalid email format.");
  }
  if (mobile && !isValidMobile(mobile)) {
    errors.push("Invalid mobile format.");
  }

  if (errors.length) {
    return res.status(400).json({ message: errors.join(" ") });
  }

  const updates = { firstname, lastname, email, mobile };

  try {
    const updatedUser = await User.findByIdAndUpdate(_id, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Invalidate the cache for the specific user
    const userKey = `/api/user/${_id}`;
    cache.del(userKey);

    res.status(200).json({
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(`Failed to update user: ${error.message}`);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
});

/**
 * @route PUT /api/user/block-user/:id
 * @description Allows administrators to block a specific user in the system based on the provided user ID.
 * The user's `isBlocked` field will be set to `true`. The function will first validate the MongoDB ID format,
 * and if it's incorrect, a relevant error message is returned. If the user does not exist in the system,
 * an appropriate "not found" message will be sent back to the client.
 * This route should be protected and only accessible by administrators.
 * @param {Object} req - Express request object. Expected to contain the user ID in the route parameters.
 * @param {Object} res - Express response object. Returns a success message if user is blocked successfully,
 * or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, user not found, database errors, or other internal issues.
 * @returns {Object} JSON response with a success message or an error message.
 */
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validateMongoDbId(id)) {
    return res.status(400).json({ message: "Invalid user ID." }); // BAD_REQUEST
  }

  try {
    const blockusr = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );

    if (!blockusr) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." }); // NOT_FOUND
    }

    // Invalidate the cache for the specific user
    const userKey = `/api/user/${id}`;
    cache.del(userKey);

    res.status(200).json({ message: "User successfully blocked." }); // OK
  } catch (error) {
    console.error(`Failed to block user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to block user due to an internal error.",
    }); // INTERNAL_SERVER_ERROR
  }
});

/**
 * @route PUT /api/user/unblock-user/:id
 * @description Allows administrators to unblock a specific user in the system based on the provided user ID.
 * The user's `isBlocked` field will be set to `false`. The function will first validate the MongoDB ID format,
 * and if it's incorrect, a relevant error message is returned. If the user does not exist in the system,
 * an appropriate "not found" message will be sent back to the client.
 * This route should be protected and only accessible by administrators.
 * @param {Object} req - Express request object. Expected to contain the user ID in the route parameters.
 * @param {Object} res - Express response object. Returns a success message if user is unblocked successfully,
 * or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, user not found, database errors, or other internal issues.
 * @returns {Object} JSON response with a success message or an error message.
 */
const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ message: "Invalid user ID." }); // BAD_REQUEST
  }

  try {
    // Attempt to find the user and update their block status to "false"
    const unblock = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );

    // Check if user was found and updated
    if (!unblock) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." }); // NOT_FOUND
    }

    // Invalidate the cache for the specific user
    const userKey = `/api/user/${id}`;
    cache.del(userKey);

    // User was successfully unblocked
    res.status(200).json({ message: "User successfully unblocked." }); // OK
  } catch (error) {
    console.error(`Failed to unblock user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to unblock user due to an internal error.",
    }); // INTERNAL_SERVER_ERROR
  }
});

/**
 * @route PUT /api/user/update-password
 * @description Updates the password of the authenticated user. If the user is not found or the provided password is invalid, an error message will be returned.
 * This function requires the user's ID from the request user object and the new password from the request body.
 * Upon successful update, a success message is sent in the response.
 * @param {Object} req - Express request object containing the user ID and new password.
 * @param {Object} res - Express response object. Returns a success message upon successful password update or an appropriate error message.
 * @throws {Error} Possible errors include invalid user ID, user not found, or missing new password in the request body.
 * @returns {Object} JSON response with a success message upon successful password update or an appropriate error message.
 */
const updatePassword = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  const { password } = req.body;

  // Validate the MongoDB ID
  if (!validateMongoDbId(_id)) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  // Fetch the user by their ID
  const user = await User.findById(_id);

  // If no user found, send a 404 error
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // If a new password is provided, update it
  if (password) {
    user.password = password;
    await user.save();

    // Invalidate the cache for the specific user
    const userKey = `/api/user/${_id}`;
    cache.del(userKey);

    // Ideally, don't send back the entire user object with the password, even if it's hashed.
    // Instead, send a success message.
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  }

  // If no new password is provided, notify the user.
  return res
    .status(400)
    .json({ success: false, message: "Please provide a new password" });
});

/**
 * @route POST /api/user/forgot-password-token
 * @description Generates a password reset token for a user and sends an email with a reset link.
 * If the user is not found with the provided email, an error message will be returned.
 * This function requires the user's email from the request body.
 * Upon successful token generation and email sending, a success message is sent in the response.
 * @param {Object} req - Express request object containing the user's email.
 * @param {Object} res - Express response object. Returns a success message upon successful email sending or an appropriate error message.
 * @throws {Error} Possible errors include user not found, issues generating the token, or problems sending the email.
 * @returns {Object} JSON response with a success message upon successful email sending or an appropriate error message.
 */
const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // 1. Check if the user exists for the provided email.
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found with this email" });
  }

  try {
    // 2. Create a password reset token for the user.
    const token = await user.createPasswordResetToken();

    // Save the token to the user's record. This assumes that the method
    // createPasswordResetToken modifies the user instance.

    await User.findOneAndUpdate(
      { _id: user._id },
      {
        passwordResetToken: user.passwordResetToken,
        passwordResetExpires: user.passwordResetExpires,
      }
    );

    // 3. Create the reset URL and structure the email content.
    const resetURL = `
        Hi,
        Please follow this link to reset your password.
        This link is valid for 10 minutes from now.
        <a href='http://localhost:3000/api/user/reset-password/${token}'>Click Here</a>
      `;

    const emailData = {
      to: email,
      subject: "Forgot Password Link",
      text: "Hey User, follow the instructions in the email to reset your password.",
      html: resetURL,
    };

    // 4. Send the email with the reset link.
    sendEmail(emailData);

    // Send a success response. It's better not to send the token in the response
    // for security reasons. Instead, just inform the user that the email has been sent.
    res
      .status(200)
      .json({ message: "Reset password email sent.", token: token });
  } catch (error) {
    console.error("Error in forgotPasswordToken:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * @route PUT /api/user/reset-password/:token
 * @description Resets the password of a user using the provided reset token. If the token is invalid or has expired, an error message will be returned.
 * The function requires the new password from the request body and the reset token from the request params.
 * Upon successful password reset, a success message is sent in the response.
 * @param {Object} req - Express request object containing the reset token in params and new password in the body.
 * @param {Object} res - Express response object. Returns a success message upon successful password reset or an appropriate error message.
 * @throws {Error} Possible errors include invalid token, token expiration, or any errors during the reset process.
 * @returns {Object} JSON response with a success message upon successful password reset or an appropriate error message.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  const { token } = req.params;

  // 1. Check for blank fields.
  if (!password || !confirmPassword) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }

  // 2. Check if password and confirmPassword match.
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords are not the same." });
  }

  // 3. Hash the provided token to match the hashed token stored in the database.
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 4. Find a user with the hashed token and check if the token hasn't expired.
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res
      .status(400)
      .json({ message: "Token expired or invalid. Please request a new one." });
  }
  // 5. Check if user added old password or new one
  const isSamePassword = await bcrypt.compare(password, user.password);
  if (isSamePassword) {
    return res.status(400).json({
      message: "You can't use your old password. Please go with a new one.",
    });
  }

  // 6. Update the user's password and clear the password reset fields.
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // Save the updated user data.
  await user.save();

  // Return a success response.
  res
    .status(200)
    .json({ success: true, message: "Password reset successfully." });
});

/**
 * @route GET /api/user/wishlist
 * @description Fetch the wishlist of the authenticated user.
 * The function will try to find the user by the provided user ID and then populate the 'wishlist' field.
 * @param {Object} req - Express request object. Expected to have user ID in req.user.
 * @param {Object} res - Express response object. Returns the populated user's wishlist or an error message.
 * @throws {Error} Possible errors include database issues or missing user ID.
 * @returns {Object} JSON response with the user's wishlist or an error message.
 */
const getWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  try {
    // Fetch the user and populate the wishlist field
    const userWithWishlist = await User.findById(_id).populate({
      path: "wishlist",
      select: "-ratings -createdAt -updatedAt -__v -quantity",
    });

    if (!userWithWishlist) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: userWithWishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the wishlist.",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/user/saveAddress
 * @description Saves or updates the user's address after verifying its existence using the MapQuest API.
 * The request body should contain an address object with fields: lane1, lane2, city, pincode, district, and country.
 * The function validates:
 *   1. The MongoDB ID of the user making the request.
 *   2. The presence of all required address fields in the request body.
 *   3. The authenticity of the address using the MapQuest API.
 * If any of the validations fail, the function will return an error message.
 * If all validations pass, the address is saved/updated for the user in the database.
 * @param {Object} req - Express request object. Contains user ID from JWT payload and address in request body.
 * @param {Object} res - Express response object. Returns the updated user data with the saved address or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Missing address fields.
 *   3. Invalid address as per the MapQuest API.
 *   4. Database errors during the update process.
 * @returns {Object} JSON response with updated user data containing saved address or an error message.
 */
const saveAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Validate MongoDB ID
  if (!validateMongoDbId(userId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  // Check if address is provided in request body
  const address = req.body.address;
  if (!address) {
    return res.status(400).json({
      success: false,
      message: "Address is required.",
    });
  }

  // Validate each address field
  const requiredFields = [
    "lane1",
    "lane2",
    "city",
    "pincode",
    "district",
    "country",
  ];
  const missingFields = requiredFields.filter((field) => !address[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `The following address fields are missing: ${missingFields.join(
        ", "
      )}.`,
    });
  }

  // Validate address using MapQuest API
  const isValidAddress = await validateAddressWithMapQuest(address);
  if (!isValidAddress) {
    return res.status(400).json({
      success: false,
      message: "The provided address is not valid.",
    });
  }

  try {
    // Update the user's address
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        address: address,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while saving the address.",
      error: error.message,
    });
  }
});

module.exports = {
  createUser,
  loginUser,
  getAllUsers,
  getaUser,
  deleteUser,
  updateUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logoutUser,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishlist,
  saveAddress,
};
