process.env.NODE_ENV='test';
require('dotenv').config({path: '.env.test'});

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('ML_SERVICE_BASE_URL:', process.env.ML_SERVICE_BASE_URL);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
