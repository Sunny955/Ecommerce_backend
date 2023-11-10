const { generateToken } = require("../config/jwtToken");
const User = require("../models/UserModel");
const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");
const Coupon = require("../models/CouponModel");
const Order = require("../models/OrderModel");
const asyncHandler = require("express-async-handler");
const {
  isValidEmail,
  isValidName,
  isValidMobile,
  validateMongoDbId,
  validateStatus,
} = require("../utils/reqValidations");
const allUsersKey = "/api/v1/user/all-users";
const { generateRefreshToken } = require("../config/refreshToken");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../controller/EmailController");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { cache } = require("../middlewares/cacheMiddleware");
const uniqid = require("uniqid");
const { validateAddressWithMapQuest } = require("../utils/authAddress");
const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("../utils/cloudinary");
const fs = require("fs");

// for every route put v1 after api like: api/v1/user/...

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
    return res
      .status(400)
      .json({ success: false, message: "Email is required." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists!" });
    }

    // Create a new user
    const newUser = await User.create({ email, address: {}, ...otherData });

    // Invalidate the cache for all users
    cache.del(allUsersKey);

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    // Ideally, we should send the error to a logger and provide a generic error message to the client.
    console.error(`Failed to create user: ${error.message}`);
    res.status(500).json({ success: false, message: "Internal server error." });
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

    // create an empty cart for the logged in user
    let userCart = await Cart.findOne({ orderby: findUser._id });

    if (!userCart) {
      userCart = new Cart({ orderby: findUser._id });
      await userCart.save();
    }
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
    secure: true, // Set the secure flag for HTTPS
    sameSite: "strict", // Setting it to 'strict' for maximum security
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
 * @route GET /api/user/get-user/:id
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
      "wishlist cart blogs enquiries",
      "-createdAt -updatedAt -__v -quantity -name -email -mobile -user"
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
 * @route GET /api/user/get-info
 * @description Retrieves the details of the currently logged-in user based on the user ID extracted from the authenticated request.
 * If the user doesn't exist in the database, an appropriate "not found" message is sent back to the client.
 * The function returns select fields for the user, namely: firstname, lastname, address, wishlist, cart, pic, mobile, and email.
 * Both the cart and wishlist fields are populated to provide detailed information.
 * @param {Object} req - Express request object. Expected to contain the authenticated user ID.
 * @param {Object} res - Express response object. Returns the details of the logged-in user if found, or an appropriate error message.
 * @throws {Error} Possible errors include user not found in the database, database errors, or other internal issues.
 * @returns {Object} JSON response with a success flag, the logged-in user's details (if found), or an error message.
 */
const getLoggedinUser = asyncHandler(async (req, res) => {
  const userId = req?.user?._id;

  try {
    const user = await User.findById(userId)
      .select(
        "firstname lastname address wishlist cart pic mobile email enquiries"
      )
      .populate(
        "cart wishlist blogs enquiries",
        "-name -email -mobile -user -__v"
      )
      .exec();

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid user" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.log("Errror occured", error.message);

    res.status(500).json({ success: false, message: "Internal server error" });
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
    return res
      .status(400)
      .json({ success: false, message: "Invalid user ID." });
  }

  try {
    const deletedUser = await User.findByIdAndDelete(_id);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${_id}`;
    cache.del(userKey);
    cache.del(allUsersKey);

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
    return res.status(400).json({ success: false, message: errors.join(" ") });
  }

  const updates = { firstname, lastname, email, mobile };

  try {
    const updatedUser = await User.findByIdAndUpdate(_id, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${_id}`;
    cache.del(userKey);
    cache.del(allUsersKey);

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "User updated successfully.",
    });
  } catch (error) {
    console.error(`Failed to update user: ${error.message}`);
    res.status(500).json({ success: false, message: "Internal server error." });
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
    const userKey = `/api/v1/user/${id}`;
    cache.del(userKey);
    cache.del(allUsersKey);

    res
      .status(200)
      .json({ success: true, message: "User successfully blocked." });
  } catch (error) {
    console.error(`Failed to block user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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
    return res
      .status(400)
      .json({ success: false, message: "Invalid user ID." }); // BAD_REQUEST
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
    const userKey = `/api/v1/user/${id}`;
    cache.del(userKey);
    cache.del(allUsersKey);

    // User was successfully unblocked
    res
      .status(200)
      .json({ success: true, message: "User successfully unblocked." });
  } catch (error) {
    console.error(`Failed to unblock user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to unblock user due to an internal error.",
    });
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
const updatePassword = asyncHandler(async (req, res) => {
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
    const userKey = `/api/v1/user/${_id}`;
    cache.del(userKey);
    cache.del(allUsersKey);

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
    return res
      .status(404)
      .json({ success: false, message: "User not found with this email" });
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
        <a href='http://localhost:3000/api/v1/user/reset-password/${token}'>Click Here</a>
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
    res.status(200).json({
      success: true,
      message: "Reset password email sent.",
      token: token,
    });
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
    return res
      .status(400)
      .json({ success: false, message: "Please fill in all fields." });
  }

  // 2. Check if password and confirmPassword match.
  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords are not the same." });
  }

  // 3. Hash the provided token to match the hashed token stored in the database.
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 4. Find a user with the hashed token and check if the token hasn't expired.
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Token expired or invalid. Please request a new one.",
    });
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
    const userWithWishlist = await User.findById(_id)
      .select("pic wishlist firstname lastname")
      .populate({
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

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${userId}`;
    cache.del(userKey);
    cache.del(allUsersKey);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.log("error occurred", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * @title User cart and orders functions
 * @desc The functions below are for user cart and user orders
 **/

/**
 * @route POST /api/user/add-cart
 * @description Adds or updates the user's shopping cart after validating each product's existence and price.
 * The request body should contain an array of cart items, where each item has fields: _id (product ID), count, and color.
 * The function validates:
 *   1. The MongoDB ID of the user making the request.
 *   2. The existence of each product in the cart using its ID.
 *   3. The current price of each product from the database.
 * If any of the validations fail, the function will return an error message.
 * If all validations pass, the cart is saved/updated for the user in the database.
 * @param {Object} req - Express request object. Contains user ID from JWT payload and cart items in request body.
 * @param {Object} res - Express response object. Returns the new or updated cart data or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Product not found in the database.
 *   3. Database errors during cart update or creation.
 * @returns {Object} JSON response with the new or updated cart data or an error message.
 */
const userCart = asyncHandler(async (req, res) => {
  const { cart } = req.body;
  const userId = req?.user?._id;

  // Validate the user's ID
  if (!validateMongoDbId(userId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  try {
    // Find and remove any existing cart for the user
    await Cart.findOneAndRemove({ orderby: userId });

    // Map over the cart items and prepare them for insertion
    const products = await Promise.all(
      cart.map(async (item) => {
        const product = await Product.findById(item._id)
          .select("price quantity color title")
          .exec();

        if (!product) {
          return res.status(400).json({
            success: false,
            message: "Product with this ID doesn't exists",
          });
        }

        if (item.count > product?.quantity) {
          throw new Error(
            `Only ${product.quantity} quantity of ${product.title} is available.`
          );
        }

        if (item.color && !product.color.includes(item.color.toLowerCase())) {
          throw new Error(
            `${item.color} color for ${
              product.title
            } is not available. Available colors: ${product.color.join(", ")}.`
          );
        }

        return {
          product: item._id,
          count: item.count,
          color: item?.color || product?.color[0] || "General",
          price: product.price,
        };
      })
    );

    // Calculate the cart total
    const cartTotal = products.reduce(
      (acc, curr) => acc + curr.price * curr.count,
      0
    );

    // Prepare the new cart but don't save yet
    const newCart = new Cart({
      products,
      cartTotal,
      orderby: userId,
    });

    // Run validation
    await newCart.validate();

    // Now save the cart
    await newCart.save();

    // Update user's cart field to reference the new cart
    const user = await User.findById(userId);

    user.cart = newCart._id;

    // Update user's cart field to reference the new cart using updateOne
    await User.updateOne({ _id: userId }, { $set: { cart: newCart._id } });

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${userId}`;
    cache.del(userKey);

    return res.status(201).json({ success: true, data: newCart });
  } catch (error) {
    // Depending on the error type, you can send different error responses
    if (error.message.includes("Product with ID")) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error.message.includes("Only")) {
      // Checking if the error is due to exceeded quantity
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error.message.includes("color")) {
      // Checking if the error is due to exceeded quantity
      return res.status(400).json({ success: false, message: error.message });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route PUT /api/user/cart/update-cart
 * @description Updates the cart for a user by adding new products or updating the quantity of existing products.
 * The function uses the user's ID (from the request user object) to identify the user's cart and products
 * from the request body to update the cart. If any validation fails (like a product not being available
 * or exceeding available quantity), an error message is returned.
 * @param {Object} req - Express request object containing the user's ID and an array of products (with their IDs, desired quantities, and optionally colors) to be added/updated.
 * @param {Object} res - Express response object. Returns the updated cart upon successful cart update or an appropriate error message.
 * @throws {Error} Possible errors include invalid product IDs, exceeding available quantity, unavailable color selection, or any other issues during the cart update process.
 * @returns {Object} JSON response with the updated cart upon successful cart update or an appropriate error message.
 */
const updateUserCart = asyncHandler(async (req, res) => {
  const { productsToAdd } = req.body;
  const userId = req?.user?._id;

  // Validate the user's ID
  if (!validateMongoDbId(userId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  try {
    // Fetch the existing cart for the user
    const existingCart = await Cart.findOne({ orderby: userId });
    if (!existingCart) {
      return res
        .status(404)
        .json({ success: false, message: "No cart found for this user" });
    }

    const productIdsToAdd = productsToAdd.map((p) => p._id);
    const products = await Product.find({ _id: { $in: productIdsToAdd } })
      .select("price quantity color title")
      .exec();

    const additionalProducts = [];

    for (let item of productsToAdd) {
      const product = products.find((p) => p._id.toString() === item._id);

      if (!product) {
        throw new Error(`Product with ID ${item._id} doesn't exist.`);
      }

      if (item.count > product?.quantity) {
        throw new Error(
          `Only ${product.quantity} quantity of ${product.title} is available.`
        );
      }

      if (item.color && !product.color.includes(item.color.toLowerCase())) {
        throw new Error(
          `${item.color} color for ${
            product.title
          } is not available. Available colors: ${product.color.join(", ")}.`
        );
      }

      // Check if this product is already in the cart
      const existingProductInCart = existingCart.products.find(
        (p) =>
          p.product.toString() === item._id &&
          p.color === (item?.color || product?.color[0] || "General")
      );

      if (existingProductInCart) {
        // If product already exists in cart, update its count
        existingProductInCart.count += item.count;
      } else {
        // If product doesn't exist in cart, add it
        additionalProducts.push({
          product: item._id,
          count: item.count,
          color: item?.color || product?.color[0] || "General",
          price: product.price,
        });
      }
    }

    // Add the additional products (new entries) to the existing cart's products
    existingCart.products.push(...additionalProducts);

    // Update the cart total
    existingCart.cartTotal += additionalProducts.reduce(
      (acc, curr) => acc + curr.price * curr.count,
      0
    );

    // Validate and save the updated cart
    await existingCart.validate();
    await existingCart.save();

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${userId}`;
    cache.del(userKey);

    return res.status(200).json({ success: true, data: existingCart });
  } catch (error) {
    // Depending on the error type, you can send different error responses
    if (error.message) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route GET /api/user/get-cart
 * @description Retrieves the user's shopping cart.
 * It populates the product details for each item in the cart using the product's ID.
 * The function validates:
 *   1. The MongoDB ID of the user making the request.
 * If validation fails, the function will return an error message.
 * If validation passes, it returns the cart associated with the user.
 * @param {Object} req - Express request object. Contains user ID from JWT payload.
 * @param {Object} res - Express response object. Returns the user's cart data or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Database errors during the retrieval process.
 * @returns {Object} JSON response with the user's cart data or an error message.
 */
const getUserCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  // Validate the user's ID
  if (!validateMongoDbId(_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  try {
    const cart = await Cart.findOne({ orderby: _id })
      .select("-__v")
      .populate("products.product", "-quantity -slug -__v");
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found for the user." });
    }
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error(`Error occurred while fetching user cart: ${error.message}`); // It's useful to log the error for debugging
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve cart" });
  }
});

/**
 * @route DELETE /api/user/delete-cart
 * @description Empties the user's cart by removing the associated cart from the database.
 * The function:
 *   1. Validates the MongoDB ID of the user making the request.
 *   2. Finds the user's associated cart using the "orderby" field.
 *   3. Removes the found cart from the database.
 * If the cart is successfully removed, the function will return the removed cart's details.
 * If any issues arise, the function will return an error message.
 * @param {Object} req - Express request object. Contains user ID from JWT payload.
 * @param {Object} res - Express response object. Returns the removed cart's details or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Issues with removing the cart from the database.
 * @returns {Object} JSON response with removed cart details or an error message.
 */
const emptyCart = asyncHandler(async (req, res) => {
  const userId = req?.user?._id;

  // Validate the user's ID
  if (!validateMongoDbId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Provided ID is not a valid MongoDB ID.",
    });
  }

  try {
    // Find the associated cart for the user
    const userCart = await Cart.findOne({ orderby: userId });

    // If there wasn't any cart associated with the user, inform the client
    if (!userCart) {
      return res.status(404).json({
        success: false,
        message: "No cart associated with the user.",
      });
    }

    // Empty the products in the cart and modify the price
    userCart.products = [];
    userCart.cartTotal = 0;
    userCart.totalAfterDiscount = 0;

    // Save the updated cart
    await userCart.save();

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${userId}`;
    cache.del(userKey);

    res.status(200).json({
      success: true,
      data: userCart,
      message: "Products removed from the cart successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error emptying cart: " + error.message,
    });
  }
});

/**
 * @route POST /api/user/cart/coupon
 * @description Applies a coupon to the user's cart, calculates the new total after applying the discount,
 * and updates the user's cart with this discounted total.
 * The function:
 *   1. Validates the MongoDB ID of the user making the request.
 *   2. Checks if the provided coupon is valid.
 *   3. Calculates the new total after applying the discount.
 *   4. Updates the cart's `totalAfterDiscount` field.
 * If successful, the function will return the new discounted total.
 * If any issues arise, the function will return an error message.
 * @param {Object} req - Express request object. Contains the user ID from JWT payload and the coupon name in the body.
 * @param {Object} res - Express response object. Returns the new discounted total or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Invalid coupon name.
 *   3. Database errors during update process.
 * @returns {Object} JSON response with new discounted total or an error message.
 */
const applyCoupon = asyncHandler(async (req, res) => {
  const { coupon } = req.body;
  const userId = req?.user?._id;

  // Validate the user's ID
  if (!validateMongoDbId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Provided ID is not a valid MongoDB ID.",
    });
  }
  const upperCaseCoupon = coupon.toUpperCase();
  try {
    // Check if the provided coupon is valid
    const validCoupon = await Coupon.findOne({ name: upperCaseCoupon });
    if (!validCoupon) {
      return res.status(400).json({
        success: false,
        message: "Invalid Coupon",
      });
    }

    // Fetch the user's current cart total
    const cart = await Cart.findOne({ orderby: userId }).populate(
      "products.product"
    );
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "No cart associated with the user.",
      });
    }

    // Calculate the total after applying the coupon discount
    const totalAfterDiscount = (
      cart.cartTotal -
      (cart.cartTotal * validCoupon.discount) / 100
    ).toFixed(2);

    // Update the cart's `totalAfterDiscount` field
    const updatedCart = await Cart.findOneAndUpdate(
      { orderby: userId },
      { totalAfterDiscount },
      { new: true, runValidators: true }
    );

    if (!updatedCart) {
      return res.status(500).json({
        success: false,
        message: "Error updating the cart with the discounted total.",
      });
    }

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${userId}`;
    cache.del(userKey);

    res.status(200).json({
      success: true,
      data: { totalAfterDiscount },
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/user/cart/cash-order
 * @description Creates a new order for the user based on their cart. The function:
 *   1. Validates the MongoDB ID of the user making the request.
 *   2. Ensures Cash on Delivery (COD) method is provided.
 *   3. Fetches the user and their associated cart.
 *   4. Determines the final order amount, considering any applied coupons.
 *   5. Constructs and saves a new order with product details and payment intent.
 *   6. Updates product quantities and sales figures in the Product collection.
 * If successful, the function will return a success message and the created order details.
 * If any issues arise, the function will return an error message.
 * @param {Object} req - Express request object. Contains the user ID from JWT payload, and details like COD and coupon application in the body.
 * @param {Object} res - Express response object. Returns a success message and order details or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. No COD provided.
 *   3. No associated cart for the user.
 *   4. Database errors during order creation or product updates.
 * @returns {Object} JSON response with a success message and order details or an error message.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { COD, couponApplied } = req.body;
  const { _id: userId } = req.user;

  // Validate user's ID
  if (!validateMongoDbId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid MongoDB ID",
    });
  }

  // Ensure Cash on Delivery (COD) method is provided
  if (!COD) {
    return res.status(400).json({
      success: false,
      message: "Create cash order failed",
    });
  }

  try {
    // Fetch the user and associated cart
    const user = await User.findById(userId);
    const userCart = await Cart.findOne({ orderby: userId });

    if (!user.address || !user.address.city || !user.address.pincode) {
      return res.status(404).json({
        success: false,
        message:
          "Please complete your address details before processing the order",
      });
    }

    if (!userCart) {
      return res.status(404).json({
        success: false,
        message: "No cart associated with the user.",
      });
    }

    // Determine the final amount based on whether a coupon has been applied
    const finalAmount =
      couponApplied && userCart.totalAfterDiscount
        ? userCart.totalAfterDiscount
        : userCart.cartTotal;

    // Create a new order
    const newOrder = await new Order({
      products: userCart.products,
      paymentIntent: {
        id: uniqid(),
        method: "COD",
        amount: finalAmount,
        status: "Cash On Delivery",
        created: Date.now(),
        currency: "inr",
      },
      orderby: userId,
      orderStatus: "Processing",
    }).save();

    // Update the product quantities and sales figures in the Product collection
    const bulkOperations = userCart.products.map((item) => ({
      updateOne: {
        filter: { _id: item.product._id },
        update: {
          $inc: { quantity: -item.count, sold: +item.count },
        },
      },
    }));
    await Product.bulkWrite(bulkOperations);

    // Once order is created successfully, empty the user's cart
    userCart.products = [];
    userCart.cartTotal = 0;
    userCart.totalAfterDiscount = userCart.cartTotal;
    await userCart.save();

    res.status(201).json({
      success: true,
      data: newOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error(`Error occurred while creating order: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
});

/**
 * @route GET /api/user/order/get-orders
 * @description Retrieves all the orders associated with a user.
 * The function:
 *   1. Validates the MongoDB ID of the user making the request.
 *   2. Queries the database to fetch all orders associated with the user.
 *   3. Populates product details and user details in the orders.
 * If successful, the function will return the user's orders.
 * If any issues arise, the function will return an error message.
 * @param {Object} req - Express request object. Contains the user ID from JWT payload.
 * @param {Object} res - Express response object. Returns the user's orders or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Database errors during the query process.
 * @returns {Object} JSON response with user's orders or an error message.
 */
const getOrders = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;

  // Validate the user's ID
  if (!validateMongoDbId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid MongoDB ID",
    });
  }

  try {
    // Fetch all orders associated with the user, while populating product and user details
    const userOrders = await Order.find({ orderby: userId })
      .select("-__v -createdAt -updatedAt")
      .populate("products.product", "-__v -createdAt -updatedAt")
      .populate("orderby", "_id address firstname lastname email cart wishlist")
      .exec();

    if (!userOrders || userOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for the user.",
      });
    }

    res.status(200).json({
      success: true,
      data: userOrders,
    });
  } catch (error) {
    console.error(
      `Error occurred while fetching user orders: ${error.message}`
    );
    res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
    });
  }
});

/**
 * @route GET /api/user/order/get-all-orders
 * @description Retrieves all the orders across all users in the system.
 * The function:
 *   1. Queries the database to fetch all orders.
 *   2. Populates product details and user details in the orders.
 * If successful, the function will return all the orders.
 * If any issues arise, the function will return an error message.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object. Returns all orders or an error message.
 * @throws {Error} Possible errors include database errors during the query process.
 * @returns {Object} JSON response with all orders or an error message.
 */
const getAllOrders = asyncHandler(async (req, res) => {
  try {
    // Fetch all orders in the system, while populating product and user details
    const allUserOrders = await Order.find()
      .select("-__v -createdAt -updatedAt")
      .populate("products.product", "-__v -createdAt -updatedAt")
      .populate("orderby", "_id address firstname lastname email cart wishlist")
      .exec();

    if (!allUserOrders || allUserOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found.",
      });
    }

    res.status(200).json({
      success: true,
      data: allUserOrders,
    });
  } catch (error) {
    console.error(`Error occurred while fetching all orders: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve all orders",
    });
  }
});

/**
 * @route GET /api/user/order/:id
 * @description Retrieves orders specific to a user based on the provided user ID.
 * The function:
 *   1. Validates the provided MongoDB user ID.
 *   2. Queries the database to fetch orders associated with the user ID.
 *   3. Populates product details and user details within the order.
 * If successful, the function will return the user's order(s).
 * If any issues arise, the function will return an error message.
 * @param {Object} req - Express request object. Contains the user ID in the params.
 * @param {Object} res - Express response object. Returns the user's orders or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Database errors during the query process.
 * @returns {Object} JSON response with the user's orders or an error message.
 */
const getOrderByUserId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate user's ID
  if (!validateMongoDbId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid MongoDB ID",
    });
  }

  try {
    // Fetch orders associated with the provided user ID
    const userOrders = await Order.find({ orderby: id })
      .select("-__v -createdAt -updatedAt")
      .populate("products.product", "-__v -createdAt -updatedAt")
      .populate("orderby", "_id address firstname lastname email cart wishlist")
      .exec();

    if (!userOrders || userOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for the specified user.",
      });
    }

    res.status(200).json({
      success: true,
      data: userOrders,
    });
  } catch (error) {
    console.error(
      `Error occurred while fetching orders for user ${id}: ${error.message}`
    );
    res.status(500).json({
      success: false,
      message: "Failed to retrieve orders for the specified user",
    });
  }
});

/**
 * @route PUT /api/user/order/:id/status
 * @description Updates the status of a specific order based on the provided order ID and status.
 * The function:
 *   1. Validates the provided MongoDB order ID.
 *   2. Updates the order's status and associated payment intent status.
 * If successful, the function returns the updated order.
 * If any issues arise, the function returns an error message.
 * @param {Object} req - Express request object. Contains the order ID in the params and desired status in the body.
 * @param {Object} res - Express response object. Returns the updated order or an error message.
 * @throws {Error} Possible errors include:
 *   1. Invalid MongoDB ID.
 *   2. Database errors during the update process.
 * @returns {Object} JSON response with the updated order or an error message.
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;
  const { id } = req.params;

  if (!validateMongoDbId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid MongoDB ID",
    });
  }

  const validStatuses = [
    "not processed",
    "in transit",
    "processing",
    "dispatched",
    "cancelled",
    "delivered",
  ];
  const paymentStatuses = [
    "processing",
    "waiting",
    "payment successful",
    "payment failed",
    "declined",
    "cash on delivery",
  ];

  const Status = validateStatus(orderStatus, validStatuses);
  const paymentStatusFormatted = validateStatus(paymentStatus, paymentStatuses);

  if (!Status) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status provided.",
    });
  }

  if (!paymentStatusFormatted) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment status provided.",
    });
  }

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: Status,
        "paymentIntent.status": paymentStatusFormatted, // directly update the nested field
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found with the specified ID.",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    console.error(`Error updating order status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
});

/**
 * @route POST /api/user/upload/user-pic
 * @description Uploads a profile picture for a user and replaces the pic field in the user model with the URL from Cloudinary.
 * @param {Object} req - Express request object. Expects the user ID in params and the image in the request files.
 * @param {Object} res - Express response object. Returns the updated user or an error message.
 * @throws {Error} Possible errors include validation, database, or image upload errors.
 * @returns {Object} JSON response with the updated user or an error message.
 */
const uploadPic = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  // No file uploaded
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No file attached" });
  } else if (req.files.length > 1) {
    return res.status(400).json({
      success: false,
      message: "Multiple files functionality doesn't exist",
    });
  }

  try {
    const file = req?.files?.[0];
    let profilePicUrl, public_id;
    if (fs.existsSync(file.path)) {
      const uploadResult = await cloudinaryUploadImg(file.path);
      public_id = uploadResult.public_id;
      profilePicUrl = uploadResult.secure_url;
      fs.unlinkSync(file.path);
    } else {
      console.log("Path doesn't exists!");
      return res.status(400).json({
        success: false,
        message: "Unable to find the path of the image",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        pic: {
          url: profilePicUrl,
          public_key: public_id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userKey = `/api/v1/user/${_id}`;
    cache.del(userKey);

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Error in uploading user profile pic:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload profile picture" });
  }
});

/**
 * @route POST /api/user/delete/user-pic
 * @description Deletes the profile picture of a user from Cloudinary, and resets the user's profile picture back to the default one in the database.
 * @param {Object} req - Express request object. Expects the user ID in params and the public_id of the image in the body.
 * @param {Object} res - Express response object. Returns a success message or an error message.
 * @throws {Error} Possible errors include validation mismatches, Cloudinary deletion errors, and database errors.
 * @returns {Object} JSON response with a success or error message.
 */
const deletePic = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { public_id } = req.body;

  // Validate that a public ID is provided
  if (!public_id) {
    return res.status(400).json({
      success: false,
      message: "public key is required to delete an image",
    });
  }

  // Fetch the user with the specified ID and select the pic field
  const user = await User.findById(_id).select("pic").exec();

  // Return error if the user doesn't exist
  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid user" });
  }

  // Return error if the provided public ID doesn't match the one in the user's document
  if (user?.pic?.public_key !== public_id) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid public_key" });
  }

  try {
    // Attempt to delete the image from Cloudinary
    const deleted = await cloudinaryDeleteImg(public_id);
    if (deleted && deleted.result === "ok") {
      // Reset the pic URL to default and update public_key in the database
      const defaultPicURL = process.env.PUBLIC_URL;
      await User.findByIdAndUpdate(_id, {
        "pic.url": defaultPicURL,
        "pic.public_key": "No public key",
      });

      // Invalidate the user's cache
      const userKey = `/api/v1/user/${_id}`;
      cache.del(userKey);

      // Respond with a success message
      return res.status(200).json({
        success: true,
        message: "Image successfully deleted and reset to default",
      });
    } else {
      throw new Error("Failed to delete image from Cloudinary");
    }
  } catch (error) {
    console.error("Error deleting image:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = {
  createUser,
  loginUser,
  getAllUsers,
  getaUser,
  getLoggedinUser,
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
  userCart,
  updateUserCart,
  getUserCart,
  emptyCart,
  applyCoupon,
  createOrder,
  getOrders,
  getAllOrders,
  getOrderByUserId,
  updateOrderStatus,
  uploadPic,
  deletePic,
};
