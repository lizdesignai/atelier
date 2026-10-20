import fs from 'fs';

const filePath = 'frontend/src/app/canais/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace /admin/inbox with /admin/fio
content = content.replace(/\/admin\/inbox/g, '/admin/fio');

// Add polling in the useEffect
const oldEffect = `    fetchMessages();

    // Inscrição em tempo real (Websockets)
    const channelSubscription = supabase.channel(\`public:messages:channel_id=eq.\${activeChannelId}\`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: \`channel_id=eq.\${activeChannelId}\` }, 
        (payload) => {
          fetchMessages(); // Atualiza a lista quando chega nova mensagem
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };`;

const newEffect = `    fetchMessages();

    // Sincronização e Polling Reativo para recepção de mensagens
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && activeChannelId) {
        fetchMessages();
      }
    }, 4000);

    return () => {
      clearInterval(pollInterval);
    };`;

content = content.replace(oldEffect, newEffect);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated canais/page.tsx successfully!');
