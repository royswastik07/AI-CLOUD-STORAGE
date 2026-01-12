// backend/queue.js
const { Queue } = require('bullmq');

// Parse Redis URL from environment or use localhost
const getRedisConnection = () => {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
    };
  }
  return { host: 'localhost', port: 6379 };
};

const fileQueue = new Queue('file-analysis', {
  connection: getRedisConnection(),
});

module.exports = fileQueue;