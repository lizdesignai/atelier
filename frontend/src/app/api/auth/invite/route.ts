// POST /api/auth/invite
// Admin/Gestor cria um novo usuário via convite.
// Senha padrão: Atelier2026! (o usuário poderá alterar depois)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';

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
        if (empresa || nome) {
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
            message: 'Usuário existente recuperado com sucesso.',
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

    // Tratar senha (customizada ou padrão Atelier2026!)
    const chosenPassword = (typeof password === 'string' && password.trim().length >= 6)
      ? password.trim()
      : DEFAULT_PASSWORD;

    // Gerar ID e hash da senha
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(chosenPassword);

    // Tratar o instagram
    let cleanInstagram = (instagram || '').trim();
    if (cleanInstagram && !cleanInstagram.startsWith('@') && !cleanInstagram.includes('instagram.com/')) {
      cleanInstagram = `@${cleanInstagram}`;
    }

    // Inserir perfil básico
    await sql`
      INSERT INTO profiles (id, email, nome, role, empresa, instagram, password_hash, created_at)
      VALUES (${userId}, ${cleanEmail}, ${nome.trim()}, ${userRole}, ${empresa || null}, ${cleanInstagram || null}, ${passwordHash}, NOW())
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

    // Se for client, criar projeto inicial
    if (userRole === 'client' && empresa && !body.skipProjectCreation) {
      const projectId = crypto.randomUUID();
      await sql`
        INSERT INTO projects (id, client_id, name, status, created_at)
        VALUES (${projectId}, ${userId}, ${`Projeto ${empresa.trim()}`}, 'active', NOW())
      `;
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

