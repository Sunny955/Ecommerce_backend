# E-Commerce Backend System

## Overview

This project presents a comprehensive backend system for a generic e-commerce platform, implemented using Node.js, Express, Mongoose, Cloudinary, Node-cache, Nodemailer, and other technologies. The backend is designed to provide essential features for an e-commerce site, ensuring scalability, security, and efficiency.

## Features

- **User Authentication and Authorization:** Secure user authentication and authorization mechanisms to protect user data and ensure secure access to sensitive functionalities.

- **Product Management:** CRUD operations for managing products, including image upload and storage with Cloudinary for products and users.

- **Order Processing:** Efficient handling of customer orders, including order creation, payment processing, and order status updates.

- **Caching:** Utilization of Node-cache for caching frequently accessed data, optimizing response times, and reducing database load.

- **Email and SMS Notifications:** Integration with Nodemailer and AWS SNS service for sending order confirmations, shipping updates, and other transactional SMS to users.

- **Deployment:** Deployed on AWS EC2 instance and used pm2, nginx for smoother running of the application

## Technologies Used

- Node.js
- Express
- Mongoose (MongoDB)
- Cloudinary
- Node-cache
- Nodemailer
- JWT
- AWS-SDK
- Axios
- Bcrypt
- Morgan
- Uniqid
- Multer
- Slugify

## Getting Started

### Prerequisites

- Node.js installed
- MongoDB instance
- Cloudinary account
- AWS account for SNS service
- Mapquest as a third party API
- JWT secret key
- Node environment(production or development)

### Installation

1. Clone the repository.
2. Install dependencies: `npm install`
3. Set up environment variables (database connection strings, Cloudinary credentials, etc.).

### Configuration

- Configure the database connection in `config/dbConnect.js`.
- Set Cloudinary credentials in `utils/cloudinary.js`.
- Set Nodemailer credentilas in `controller/EmailController.js`
- Configure AWS-SDK credentials in `utils/sendSmsMessage.js`
- Configure Mapquest API credentials in `utils/authAddress.js`

### Running the Application

```bash
npm run start

```

## The project is running and live on http://3.108.228.64/

- Register yourself on http://3.108.228.64/api/v1/user/register (POST request)
- Login on http://3.108.228.64/api/v1/user/login (POST request)
- Get info of yours on http://3.108.228.64/api/v1/user/get-info

