const { generateToken } = require("../config/jwtToken");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');
const {isValidEmail,isValidName,isValidMobile} = require("../utils/reqValidations");
const {generateRefreshToken} = require("../config/refreshToken")
const jwt = require("jsonwebtoken");

const validateMongoDbId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Create a new user in the database.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
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

// logout functionality

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
  res.status(204).json({ message: "Logged out successfully" });
});


// get all users
const getAllUsers = asyncHandler(async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10; // Default limit is 10
      const skip = parseInt(req.query.skip) || 0; // Default skip is 0
  
      const users = await User.find()
                            .limit(limit)
                            .skip(skip);
  
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
 * Get a user from the database by ID.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
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
 * Delete a user from the database by ID.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
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

  //Handle referesh token
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
 * Update an existing user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
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
 * Blocks a user in the database by admin.
 *
 * @param {Object} req - Express request object containing user ID in params.
 * @param {Object} res - Express response object for sending responses.
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
 * Unblocks a user in the database based on the provided ID.
 *
 * @param {Object} req - Express request object containing user ID in params.
 * @param {Object} res - Express response object for sending responses.
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