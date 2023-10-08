const { generateToken } = require("../config/jwtToken");
const User = require("../models/UserModel");
const asyncHandler = require("express-async-handler");

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

module.exports = {createUser,loginUser};