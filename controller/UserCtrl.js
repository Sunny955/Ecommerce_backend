const { generateToken } = require("../config/jwtToken");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');
const {isValidEmail,isValidName,isValidMobile} = require("../utils/reqValidations");

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
    const { id } = req.params;
  
    // Ensure the provided ID is a valid MongoDB ObjectID.
    if (!validateMongoDbId(id)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }
  
    try {
      const deletedUser = await User.findByIdAndDelete(id);
  
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
  

module.exports = {createUser,loginUser,getAllUsers,getaUser,deleteUser,updateUser};