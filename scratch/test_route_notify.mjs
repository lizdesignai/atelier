import fs from 'fs';
import { Resend } from '../frontend/node_modules/resend/dist/index.mjs';

const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const match = envContent.match(/RESEND_API_KEY=["']?([^"'\r\n]+)/);
const apiKey = match[1];

const resend = new Resend(apiKey);

async function testNotify() {
  console.log('Testing Resend via SDK...');
  try {
    const fromEmail = 'Studio Veronna <sistema@lizdesign.com.br>';
    const result = await resend.emails.send({
      from: fromEmail,
      to: ['igorczarr@gmail.com'],
      subject: '[Sintonia] Teste SDK',
      html: '<p>Teste de envio via Resend SDK</p>'
    });
    console.log('SDK Result:', result);
  } catch (err) {
    console.error('SDK Error caught:', err);
  }
}

testNotify();
