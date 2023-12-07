const fs = require("fs");
const caCert = fs.readFileSync(process.env.ES_CERT_PATH);
const { Client } = require("@elastic/elasticsearch");

// Create an Elasticsearch client
const client = new Client({
  node: process.env.ES_URL,
  auth: {
    username: process.env.ES_USERNAME,
    password: process.env.ES_PASSWORD,
  },
  tls: {
    ca: caCert,
    rejectUnauthorized: true,
  },
});

module.exports = { client };
