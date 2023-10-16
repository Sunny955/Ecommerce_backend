const redis = require('redis');

// Create a Redis client
const client = redis.createClient({   
    port: 6379         
});

client.on('connect', () => {
    console.log('Connected to Redis...');
});

client.on('error', (error) => {
    console.error('Redis Error:', error);
});

client.connect();

module.exports = client;
