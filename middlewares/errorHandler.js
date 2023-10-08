// not found

const notFound = (req,res,next) => {
    const error = new Error(`Not Found : ${req.originalURL}`);
    res.status(404);
    next(error);
}

//Error Handler
// const errorHandler = (err,req,res,next) => {
//     const statusCode = res.statusCode == 200 ? 500 : res.statusCode;
//     res.status(statusCode);
//     res.json({
//         message:err?.message,
//         stack:err?.stack
//     });
// }

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Handling Mongoose ValidationError
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            error: messages
        });
    }

    // Handling other errors
    res.status(statusCode).json({
        message: err?.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err?.stack // Hide stack trace in production for security
    });
}


module.exports = {notFound,errorHandler};