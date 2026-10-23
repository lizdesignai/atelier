// POST /api/auth/invite
// Admin/Gestor cria um novo usuário via convite.
// Senha padrão: Atelier2026! (o usuário poderá alterar depois)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';

const generateRandomClientPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
};
const DEFAULT_PASSWORD = 'Atelier2026!';


export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    if (payload.type !== 'session') {
      return NextResponse.json({ error: 'Sessão incompleta.' }, { status: 401 });
    }

    // Verificar se é admin ou gestor
    if (!['admin', 'gestor'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores e gestores podem convidar usuários.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      email, 
      nome, 
      role, 
      empresa, 
      instagram,
      cargo,
      telefone,
      base_salary,
      baseSalary,
      deadline_buffer_days,
      deadlineBufferDays,
      skills,
      password,
      contract_status,
      contractStatus
    } = body;

    if (!email || !nome) {
      return NextResponse.json(
        { error: 'E-mail e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validar role
    const validRoles = ['client', 'colaborador', 'gestor', 'admin', 'contador'];
    const userRole = role || 'client';
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { error: `Role inválida. Válidas: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Apenas admin pode criar outros admin
    if (userRole === 'admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem criar contas admin.' },
        { status: 403 }
      );
    }

    const sql = getDb();
    const cleanEmail = email.trim().toLowerCase();

    // Verificar se email já existe
    const existing = await sql`
      SELECT id, email, nome, role, empresa, cargo, telefone, instagram 
      FROM profiles 
      WHERE LOWER(email) = ${cleanEmail} 
      LIMIT 1
    `;

    if (existing.length > 0) {
      if (body.allowExisting || body.skipProjectCreation) {
        let passwordToReturn: string | undefined = undefined;

        if (body.regeneratePassword || body.generatePassword || (typeof body.password === 'string' && body.password.trim().length >= 6)) {
          const newPassword = (typeof body.password === 'string' && body.password.trim().length >= 6)
            ? body.password.trim()
            : generateRandomClientPassword();

          const newHash = await hashPassword(newPassword);

          await sql`
            UPDATE profiles 
            SET password_hash = ${newHash},
                empresa = COALESCE(${empresa || null}, empresa),
                nome = COALESCE(${nome ? nome.trim() : null}, nome)
            WHERE id = ${existing[0].id}
          `;

          passwordToReturn = newPassword;

          // Disparar email com a nova senha se Resend estiver configurado
          try {
            const { Resend } = require('resend');
            const { sendEmailSafely, buildAppLikeEmail } = require('@/lib/resend');
            const resendApiKey = process.env.RESEND_API_KEY;
            
            if (resendApiKey) {
              const resend = new Resend(resendApiKey);
              const loginUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://atelier.lizdesign.com.br';
              const targetName = nome?.trim() || existing[0].nome || 'Cliente';

              const emailHtml = buildAppLikeEmail(
                '✨',
                'Seu Acesso ao Atelier',
                `<p>Olá <strong>${targetName}</strong>,</p>
                 <p>Seu acesso exclusivo à plataforma do Atelier foi atualizado. A partir de agora, você acompanhará todo o desenvolvimento do seu projeto por aqui.</p>
                 <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                   <p style="margin: 0 0 10px 0;"><strong>Seu E-mail:</strong> ${cleanEmail}</p>
                   <p style="margin: 0;"><strong>Sua Senha de Acesso:</strong> ${newPassword}</p>
                 </div>
                 <p><em>Recomendamos que você altere esta senha no seu primeiro acesso nas configurações.</em></p>`,
                'Acessar Meu Painel',
                loginUrl
              );

              await sendEmailSafely(resend, cleanEmail, 'Seu Acesso ao Atelier', emailHtml, 'Auth Regenerate');
            }
          } catch (emailErr) {
            console.error('[Auth Invite] Erro ao enviar email de nova senha:', emailErr);
          }
        } else if (empresa || nome) {
          await sql`
            UPDATE profiles 
            SET empresa = COALESCE(${empresa || null}, empresa),
                nome = COALESCE(${nome ? nome.trim() : null}, nome)
            WHERE id = ${existing[0].id}
          `;
        }

        return NextResponse.json(
          {
            user: {
              id: existing[0].id,
              email: existing[0].email,
              nome: nome?.trim() || existing[0].nome,
              role: existing[0].role,
              empresa: empresa || existing[0].empresa,
              telefone: existing[0].telefone,
              cargo: existing[0].cargo,
              instagram: existing[0].instagram,
            },
            defaultPassword: passwordToReturn,
            message: passwordToReturn ? `Acesso gerado com sucesso. Senha: ${passwordToReturn}` : 'Usuário existente recuperado com sucesso.',
            isExisting: true,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Este e-mail já está registado no sistema.' },
        { status: 409 }
      );
    }

    // Tratar senha (customizada, aleatória para clientes, ou padrão Atelier2026! para equipe)
    let chosenPassword = DEFAULT_PASSWORD;
    if (typeof password === 'string' && password.trim().length >= 6) {
      chosenPassword = password.trim();
    } else if (userRole === 'client') {
      chosenPassword = generateRandomClientPassword();
    }

    // Gerar ID e hash da senha
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(chosenPassword);

    // Tratar o instagram e username
    let cleanInstagram = (instagram || '').trim();
    const cleanUsername = cleanInstagram.replace(/^@/, '').replace(/.*instagram\.com\//, '').replace(/\/.*$/, '').trim();
    if (cleanUsername) {
      cleanInstagram = `@${cleanUsername}`;
    }

    // Inserir perfil básico
    await sql`
      INSERT INTO profiles (id, email, nome, role, empresa, instagram, username, password_hash, created_at)
      VALUES (${userId}, ${cleanEmail}, ${nome.trim()}, ${userRole}, ${empresa || null}, ${cleanInstagram || null}, ${cleanUsername || null}, ${passwordHash}, NOW())
    `;

    // Tratar campos adicionais de colaborador
    const cleanCargo = cargo ? String(cargo).trim() : null;
    const cleanTelefone = telefone ? String(telefone).trim() : null;
    const numericSalary = typeof baseSalary !== 'undefined' ? Number(baseSalary) : (typeof base_salary !== 'undefined' ? Number(base_salary) : null);
    const numericBuffer = typeof deadlineBufferDays !== 'undefined' ? parseInt(deadlineBufferDays, 10) : (typeof deadline_buffer_days !== 'undefined' ? parseInt(deadline_buffer_days, 10) : null);
    const cleanContractStatus = contractStatus || contract_status || 'active';
    const skillsArray = Array.isArray(skills) ? skills : [];

    // Se houver campos de colaborador, atualiza o registro com fallback seguro
    if (cleanCargo || cleanTelefone || (numericSalary !== null && !isNaN(numericSalary)) || (numericBuffer !== null && !isNaN(numericBuffer)) || skillsArray.length > 0 || cleanContractStatus) {
      try {
        await sql`
          UPDATE profiles
          SET cargo = COALESCE(${cleanCargo}, cargo),
              telefone = COALESCE(${cleanTelefone}, telefone),
              base_salary = COALESCE(${numericSalary !== null && !isNaN(numericSalary) ? numericSalary : null}, base_salary),
              deadline_buffer_days = COALESCE(${numericBuffer !== null && !isNaN(numericBuffer) ? numericBuffer : null}, deadline_buffer_days),
              contract_status = COALESCE(${cleanContractStatus}, contract_status),
              skills = COALESCE(${skillsArray.length > 0 ? skillsArray : null}, skills)
          WHERE id = ${userId}
        `;
      } catch (updateErr: any) {
        console.warn('[Auth Invite] Atualização de colunas extras no profiles via fallback:', updateErr?.message);
        if (cleanCargo) await sql`UPDATE profiles SET cargo = ${cleanCargo} WHERE id = ${userId}`.catch(() => {});
        if (cleanTelefone) await sql`UPDATE profiles SET telefone = ${cleanTelefone} WHERE id = ${userId}`.catch(() => {});
        if (numericSalary !== null && !isNaN(numericSalary)) await sql`UPDATE profiles SET base_salary = ${numericSalary} WHERE id = ${userId}`.catch(() => {});
        if (numericBuffer !== null && !isNaN(numericBuffer)) await sql`UPDATE profiles SET deadline_buffer_days = ${numericBuffer} WHERE id = ${userId}`.catch(() => {});
        if (skillsArray.length > 0) await sql`UPDATE profiles SET skills = ${skillsArray} WHERE id = ${userId}`.catch(() => {});
      }
    }

    // Inicializar pontuação de desempenho de equipe se for membro interno
    if (['colaborador', 'gestor', 'admin'].includes(userRole)) {
      try {
        await sql`
          INSERT INTO team_performance (user_id, exp_points, level_name, total_tasks_completed, avg_tnps)
          VALUES (${userId}, 0, 'Aprendiz do Cofre', 0, 10.0)
          ON CONFLICT (user_id) DO NOTHING
        `;
      } catch (perfErr: any) {
        console.warn('[Auth Invite] team_performance init warning:', perfErr?.message);
      }
    }

    // Se for client, criar projeto inicial com pipeline de tarefas se ainda não existir ativo ou se não tiver tarefas
    if (userRole === 'client' && !body.skipProjectCreation) {
      const existingActiveProject = await sql`
        SELECT id FROM projects WHERE client_id = ${userId} AND status = 'active' ORDER BY created_at DESC LIMIT 1
      `;

      let targetProjectId = existingActiveProject[0]?.id;
      let needTasks = false;

      if (!targetProjectId) {
        targetProjectId = crypto.randomUUID();
        const serviceType = body.service_type || body.servico || 'Identidade Visual';
        const projectType = body.project_package || body.type || serviceType;
        const initialIdvPhase = serviceType === 'Identidade Visual' ? 'discover' : null;
        const initialProgress = 0;
        const baseDate = new Date();
        const targetDeliveryDate = new Date(baseDate.getTime() + (21 * 24 * 60 * 60 * 1000));

        await sql`
          INSERT INTO projects (
            id,
            client_id,
            service_type,
            type,
            status,
            phase,
            fase,
            idv_phase,
            progress,
            financial_value,
            data_limite,
            delivery_target_date,
            created_at
          )
          VALUES (
            ${targetProjectId},
            ${userId},
            ${serviceType},
            ${projectType},
            'active',
            'Mesa de Trabalho',
            ${initialIdvPhase || 'reuniao'},
            ${initialIdvPhase},
            ${initialProgress},
            ${body.financial_value ? Number(body.financial_value) : 0},
            ${targetDeliveryDate.toISOString()},
            ${targetDeliveryDate.toISOString()},
            NOW()
          )
        `;
        needTasks = serviceType !== 'Identidade Visual';
      } else {
        const taskCountRes = await sql`SELECT count(*)::int as count FROM tasks WHERE project_id = ${targetProjectId} AND title != 'Teste Tarefa'`;
        if ((taskCountRes[0]?.count || 0) === 0) {
          needTasks = true;
          await sql`
            UPDATE projects
            SET phase = 'Mesa de Trabalho',
                fase = COALESCE(fase, 'reuniao'),
                idv_phase = COALESCE(idv_phase, 'discover'),
                progress = COALESCE(progress, 19)
            WHERE id = ${targetProjectId}
          `;
        }
      }

      const serviceType = body.service_type || body.servico || 'Identidade Visual';

      if (needTasks && serviceType !== 'Identidade Visual') {
        const baseDate = new Date();

        // Gerar pipeline de tarefas
        const IDV_PIPELINE = [
          { stage: "onboarding", type: "setup", title: "Formulário de cadastro & Contrato", daysOffset: 0, estTime: 30 },
          { stage: "onboarding", type: "setup", title: "Onboarding do Cliente", daysOffset: 1, estTime: 15 },
          { stage: "discover", type: "reuniao", title: "Reunião de Briefing", daysOffset: 2, estTime: 60 },
          { stage: "discover", type: "copy", title: "Análise do Briefing + Brand Snapshot", daysOffset: 3, estTime: 45 },
          { stage: "define", type: "copy", title: "Acompanhar Curadoria Visual do Cliente", daysOffset: 4, estTime: 30 },
          { stage: "define", type: "design", title: "Criar e Enviar Curadoria Visual", daysOffset: 5, estTime: 60 },
          { stage: "define", type: "design", title: "Desenvolver Território A", daysOffset: 6, estTime: 180 },
          { stage: "define", type: "design", title: "Desenvolver Território B", daysOffset: 7, estTime: 180 },
          { stage: "define", type: "copy", title: "Enviar Territórios para Avaliação", daysOffset: 8, estTime: 30 },
          { stage: "develop", type: "design", title: "Desenvolvimento do Símbolo", daysOffset: 9, estTime: 180 },
          { stage: "develop", type: "design", title: "Tipografia & Paleta Cromática", daysOffset: 10, estTime: 120 },
          { stage: "develop", type: "design", title: "Sistema Gráfico & Aplicações", daysOffset: 11, estTime: 240 },
          { stage: "present", type: "design", title: "Montagem da Apresentação Narrativa", daysOffset: 14, estTime: 120 },
          { stage: "present", type: "reuniao", title: "Reunião de Apresentação", daysOffset: 15, estTime: 60 },
          { stage: "deliver", type: "design", title: "Brand Starter Kit + Asset Library", daysOffset: 16, estTime: 90 },
          { stage: "deliver", type: "setup", title: "Checklist de Ativação + Handover", daysOffset: 17, estTime: 60 }
        ];

        const IG_SETUP = [
          { stage: "Setup Inicial", type: "setup", title: "Assinatura do contrato & Pagamento", daysOffset: 0, estTime: 30 },
          { stage: "Imersão", type: "reuniao", title: "Reunião de briefing", daysOffset: 2, estTime: 60 },
          { stage: "Estratégia", type: "copy", title: "Estudo de marca, Persona, Tom de voz", daysOffset: 5, estTime: 180 },
          { stage: "Estratégia", type: "design", title: "Alinhamento Visual (Estilo do Feed)", daysOffset: 7, estTime: 120 },
          { stage: "Estratégia", type: "copy", title: "Calendário Editorial de Conteúdos", daysOffset: 10, estTime: 90 },
          { stage: "Aprovação", type: "setup", title: "Agendamento Sistêmico & Aprovação do Cliente", daysOffset: 15, estTime: 60 },
          { stage: "Relatório", type: "setup", title: "Geração de Relatório Mensal", daysOffset: 25, estTime: 60 }
        ];

        const pipeline = serviceType === 'Identidade Visual' ? IDV_PIPELINE : IG_SETUP;

        const DEFAULT_ASSIGNEES: Record<string, string> = {
          reuniao: '55a1f766-bd50-45bd-b0bc-9af8309faa58', // Liz Oliveira
          setup: '55a1f766-bd50-45bd-b0bc-9af8309faa58',   // Liz Oliveira
          design: '55a1f766-bd50-45bd-b0bc-9af8309faa58',  // Liz Oliveira
          copy: 'b6b7db2f-cf71-4281-80a0-1d61edbed5fb',    // Igor Oliveira
          video: 'dbeedf1a-e3cb-4951-bba4-35b7d28d19b4'   // Emmanuel
        };

        const COMPLETED_IDV_TASKS = [
          "Formulário de cadastro & Contrato",
          "Onboarding do Cliente",
          "Reunião de Briefing"
        ];

        for (let index = 0; index < pipeline.length; index++) {
          const t = pipeline[index];
          const isAutoCompleted = serviceType === 'Identidade Visual' && COMPLETED_IDV_TASKS.includes(t.title);
          const isNextTask = serviceType === 'Identidade Visual' 
            ? t.title === "Análise do Briefing + Brand Snapshot"
            : index === 0;

          const taskDeadline = new Date(baseDate);
          taskDeadline.setDate(taskDeadline.getDate() + Math.round(t.daysOffset));
          const isIgPiece = serviceType === 'Gestão de Instagram' && (t.type === 'design' || t.type === 'video');
          const assignee = DEFAULT_ASSIGNEES[t.type] || '55a1f766-bd50-45bd-b0bc-9af8309faa58';

          await sql`
            INSERT INTO tasks (
              project_id,
              client_id,
              title,
              stage,
              task_type,
              status,
              completed_at,
              priority_score,
              assigned_to,
              deadline,
              estimated_time,
              is_blocked,
              ig_is_piece,
              ig_format,
              ig_publish_status,
              created_at
            )
            VALUES (
              ${targetProjectId},
              ${userId},
              ${t.title},
              ${t.stage},
              ${t.type},
              ${isAutoCompleted ? 'completed' : (isNextTask ? 'in_progress' : 'pending')},
              ${isAutoCompleted ? new Date().toISOString() : null},
              ${isNextTask ? 1000 : (100 - index)},
              ${assignee},
              ${taskDeadline.toISOString()},
              ${t.estTime},
              ${!isAutoCompleted && !isNextTask},
              ${isIgPiece},
              ${isIgPiece ? 'Reels' : null},
              ${isIgPiece ? 'in_production' : null},
              NOW()
            )
          `;
        }

        // Se IDV, atualizar progresso para 19%
        if (serviceType === 'Identidade Visual') {
          await sql`UPDATE projects SET progress = 19 WHERE id = ${targetProjectId}`;
        }

        // Limpar cache Redis
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
          await Promise.all([
            fetch(`${backendUrl}/api/v1/analytics/clear-cache`, { method: 'POST' }).catch(() => {}),
            fetch('http://localhost:3001/api/v1/analytics/clear-cache', { method: 'POST' }).catch(() => {})
          ]);
        } catch (_) {}
      }
    }

    // DISPARAR EMAIL DE BOAS VINDAS COM CREDENCIAIS
    try {
      const { Resend } = require('resend');
      const { sendEmailSafely, buildAppLikeEmail } = require('@/lib/resend');
      const resendApiKey = process.env.RESEND_API_KEY;
      
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const loginUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://atelier.lizdesign.com.br';
        
        const emailHtml = buildAppLikeEmail(
          '✨',
          'Bem-vindo ao Atelier',
          `<p>Olá <strong>${nome.trim()}</strong>,</p>
           <p>Seu acesso exclusivo à plataforma do Atelier foi liberado. A partir de agora, você acompanhará todo o desenvolvimento do seu projeto por aqui.</p>
           <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
             <p style="margin: 0 0 10px 0;"><strong>Seu E-mail:</strong> ${cleanEmail}</p>
             <p style="margin: 0;"><strong>Sua Senha:</strong> ${chosenPassword}</p>
           </div>
           <p><em>Recomendamos que você altere esta senha no seu primeiro acesso.</em></p>`,
          'Acessar Meu Painel',
          loginUrl
        );

        await sendEmailSafely(resend, cleanEmail, 'Seu Acesso ao Atelier', emailHtml, 'Auth Invite');
      }
    } catch (emailErr) {
      console.error('[Auth Invite] Erro ao enviar email de boas vindas:', emailErr);
    }

    return NextResponse.json(
      {
        user: {
          id: userId,
          email: cleanEmail,
          nome: nome.trim(),
          role: userRole,
          cargo: cleanCargo,
          empresa: empresa || null,
          telefone: cleanTelefone,
          baseSalary: numericSalary,
          deadlineBufferDays: numericBuffer,
          skills: skillsArray,
          instagram: cleanInstagram || null,
        },
        defaultPassword: chosenPassword,
        message: `Usuário criado com sucesso. Senha de acesso: ${chosenPassword}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Auth Invite] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

