// backend/queue.js
const { Queue } = require('bullmq');

// Create a new queue instance connected to our Redis server.
// The name 'file-analysis' is how we'll identify this specific queue.
const fileQueue = new Queue('file-analysis', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

module.exports = fileQueue;