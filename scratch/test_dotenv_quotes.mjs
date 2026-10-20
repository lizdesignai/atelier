import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import fs from 'fs';

const parsed = dotenv.parse(fs.readFileSync('backend/.env'));
console.log('Parsed RESEND_API_KEY starts with:', parsed.RESEND_API_KEY?.substring(0, 5));
console.log('Does it have quotes?', parsed.RESEND_API_KEY?.startsWith('"'));
