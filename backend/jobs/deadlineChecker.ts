import { supabase } from '../config/supabase';
import { NotificationService } from '../services/NotificationService';

export async function checkContractDeadlines() {
  console.log('[Cron] Verificando contratos prestes a vencer...');
  
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, contract_end, profiles(nome)')
      .in('status', ['active']);

    if (error) throw error;
    if (!projects) return;

    for (const project of projects) {
      if (!project.contract_end) continue;

      const endDate = new Date(project.contract_end);
      const today = new Date();
      
      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      // Se faltam exatamente 30, 15, ou 7 dias
      if (diffDays === 30 || diffDays === 15 || diffDays === 7) {
         // Disparar e-mail para equipe interna
         // Precisaríamos do e-mail do admin, mas vamos usar um e-mail padrão ou enviar via supabase notification table.
         // Vamos usar o e-mail cadastrado no sistema (ou da equipe)
         await NotificationService.sendNotification({
           to: 'admin@lizdesign.com.br', // Email do gestor
           type: 'contract_ending',
           clientName: project.profiles?.nome || 'Cliente Desconhecido',
           extraInfo: `${endDate.toLocaleDateString('pt-BR')} (${diffDays} dias restantes)`,
           link: `${process.env.FRONTEND_URL}/admin/projetos`
         });
         console.log(`[Cron] Aviso enviado para contrato vencendo: ${project.profiles?.nome}`);
      }
    }
  } catch (err) {
    console.error('[Cron] Erro ao checar contratos:', err);
  }
}
