const { generateToken } = require("../config/jwtToken");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');

const validateMongoDbId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const createUser = asyncHandler(async(req,res) => {
    const email = req.body.email;
    const findUser = await User.findOne({email:email});

    if(!findUser) {
        // create user
        const newUser = await User.create(req.body);
        res.status(201).json(newUser);
    } else {
        // user already exists
        res.status(400); 
        throw new Error('User already exists!');
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

// to get a single user

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

  

module.exports = {createUser,loginUser,getAllUsers,getaUser};