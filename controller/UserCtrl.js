const { generateToken } = require("../config/jwtToken");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');
const {isValidEmail,isValidName,isValidMobile,validateMongoDbId} = require("../utils/reqValidations");
const {generateRefreshToken} = require("../config/refreshToken")
const jwt = require("jsonwebtoken");

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
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists!' });
        }

        // Create a new user
        const newUser = await User.create({ email, ...otherData });
        res.status(201).json(newUser);
    } catch (error) {
        // Ideally, we should send the error to a logger and provide a generic error message to the client.
        console.error(`Failed to create user: ${error.message}`);
        res.status(500).json({ message: 'Internal server error.',
                               error : error.message });
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
        res.status(400); 
        throw new Error('Both email and password are required for login.');
    }
    const findUser = await User.findOne({email:email});

    if (findUser && await findUser.isPasswordMatched(password)) {
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
                token:generateToken(findUser._id)
            }
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials!');
    }
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
  await User.findOneAndUpdate({ refreshToken }, {
      refreshToken: "",
  });

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
        count: users.length,
        data: users
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
            success: false,
            message: 'Provided ID is not a valid MongoDB ID.'
        });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with the provided ID.'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving user: ' + error.message
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
      return res.status(400).json({ message: 'Invalid user ID.' });
    }
  
    try {
      const deletedUser = await User.findByIdAndDelete(_id);
  
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      res.status(200).json({
        message: 'User successfully deleted.',
        user: deletedUser
      });
    } catch (error) {
      // Ideally, we should send the error to a logger and provide a generic error message to the client.
      console.error(`Failed to delete user: ${error.message}`);
      res.status(500).json({ message: 'Internal server error.' });
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
        console.error('JWT_SECRET is missing in environment');
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
        errors.push('Invalid user ID.');
    }

    const { firstname, lastname, email, mobile } = req.body;
    if (firstname && !isValidName(firstname)) {
        errors.push('Invalid firstname format.');
    }
    if (lastname && !isValidName(lastname)) {
        errors.push('Invalid lastname format.');
    }
    if (email && !isValidEmail(email)) {
        errors.push('Invalid email format.');
    }
    if (mobile && !isValidMobile(mobile)) {
        errors.push('Invalid mobile format.');
    }

    if (errors.length) {
        return res.status(400).json({ message: errors.join(' ') });
    }

    const updates = { firstname, lastname, email, mobile };

    try {
        const updatedUser = await User.findByIdAndUpdate(_id, updates, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'User updated successfully.',
            user: updatedUser
        });
    } catch (error) {
        console.error(`Failed to update user: ${error.message}`);
        res.status(500).json({ message: 'Internal server error.', 
                               error : error.message });
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
      return res.status(400).json({ message: 'Invalid user ID.' }); // BAD_REQUEST
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
        return res.status(404).json({ message: 'User not found.' }); // NOT_FOUND
      }
  
      res.status(200).json({ message: 'User successfully blocked.' }); // OK
    } catch (error) {
      console.error(`Failed to block user: ${error.message}`);
      res.status(500).json({ message: 'Failed to block user due to an internal error.',
                             error: error.message}); // INTERNAL_SERVER_ERROR
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
      return res.status(400).json({ message: 'Invalid user ID.' }); // BAD_REQUEST
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
        return res.status(404).json({ message: 'User not found.' }); // NOT_FOUND
      }
  
      // User was successfully unblocked
      res.status(200).json({ message: 'User successfully unblocked.' }); // OK
    } catch (error) {
      console.error(`Failed to unblock user: ${error.message}`);
      res.status(500).json({ message: 'Failed to unblock user due to an internal error.',
                             error : error.message   }); // INTERNAL_SERVER_ERROR
    }
  });
  
  

module.exports = {createUser,loginUser,getAllUsers,getaUser,deleteUser,updateUser,blockUser,unblockUser,handleRefreshToken,logoutUser};