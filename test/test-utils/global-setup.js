const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

module.exports = async () => {
  const env = { ...process.env };
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env, cwd: path.resolve(__dirname, '../..') });
  execSync('npx prisma db seed', { stdio: 'inherit', env, cwd: path.resolve(__dirname, '../..') });
};
