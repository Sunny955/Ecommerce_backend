const { default: mongoose } = require('mongoose');

const uri = process.env.MONGODB_URI;

const dbConnect =  () => {
   try {
      const conn = mongoose.connect(uri);
      console.log("Database connected successfully!");
   } catch(err) {
        console.error("Oops! An error occured while coneecting with database");
   }
}

module.exports = dbConnect;