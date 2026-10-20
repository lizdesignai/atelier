import fs from 'fs';

const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const match = envContent.match(/RESEND_API_KEY=["']?([^"'\r\n]+)/);
const apiKey = match[1];

async function testResend() {
  console.log('Testing Resend with key:', apiKey.substring(0, 7) + '...');
  
  // Test sending to a test recipient or check domains / verify
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Studio Veronna <sistema@lizdesign.com.br>',
      to: ['igorczarr@gmail.com'], // From profiles in DB: igorczarr@gmail.com
      subject: 'Teste de Diagnóstico - Sistema de Notificação Atelier',
      html: '<h1>Teste de Sistema</h1><p>Verificando funcionamento do serviço de notificações.</p>'
    })
  });

  const status = res.status;
  const json = await res.json();
  console.log('Status:', status);
  console.log('Response:', json);
}

testResend().catch(console.error);
