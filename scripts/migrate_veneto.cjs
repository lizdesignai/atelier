require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');

const connStr = process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(connStr);

async function migrateVeneto() {
  console.log('🚀 Iniciando migração estrutural do banco de dados para o Vêneto 1.0...');

  // 1. Expansão da tabela profiles (Perfil Profissional Progressivo, Onboarding e Privacidade)
  await sql.query(`
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS area_atuacao TEXT,
      ADD COLUMN IF NOT EXISTS segmento TEXT,
      ADD COLUMN IF NOT EXISTS localizacao TEXT,
      ADD COLUMN IF NOT EXISTS interesses TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS o_que_oferece TEXT,
      ADD COLUMN IF NOT EXISTS o_que_procura TEXT,
      ADD COLUMN IF NOT EXISTS links_profissionais JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS projetos_destaque JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS veneto_objectives TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS veneto_onboarding_done BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS dm_privacy TEXT DEFAULT 'everyone',
      ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT TRUE;
  `);
  console.log('✅ Tabela profiles atualizada com campos profissionais do Vêneto.');

  // 2. Expansão da tabela community_posts (O Objeto Central: Publicações Inteligentes)
  await sql.query(`
    ALTER TABLE community_posts
      ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'discussao',
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS resolved_comment_id UUID,
      ADD COLUMN IF NOT EXISTS feedback_aspects TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS project_stage TEXT,
      ADD COLUMN IF NOT EXISTS consent_confirmed BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS offer_details TEXT,
      ADD COLUMN IF NOT EXISTS seek_details TEXT,
      ADD COLUMN IF NOT EXISTS partnership_mode TEXT,
      ADD COLUMN IF NOT EXISTS external_link TEXT,
      ADD COLUMN IF NOT EXISTS ritual_day TEXT,
      ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
  `);
  console.log('✅ Tabela community_posts atualizada para publicações inteligentes.');

  // 3. Expansão da tabela post_comments (Respostas Encadeadas e Solução Aceita)
  await sql.query(`
    ALTER TABLE post_comments
      ADD COLUMN IF NOT EXISTS parent_id UUID,
      ADD COLUMN IF NOT EXISTS is_solution BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
  `);
  console.log('✅ Tabela post_comments atualizada com suporte a threads e solução útil.');

  // 4. Tabela veneto_saved_posts (Salvamentos de Publicações e Materiais)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_saved_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      post_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, post_id)
    );
  `);
  console.log('✅ Tabela veneto_saved_posts criada.');

  // 5. Tabela veneto_connections (Motor de Relações: Conexões Profissionais)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID NOT NULL,
      following_id UUID NOT NULL,
      status TEXT DEFAULT 'connected',
      connection_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(follower_id, following_id)
    );
  `);
  console.log('✅ Tabela veneto_connections criada.');

  // 6. Tabela veneto_recognitions (Reputação e Reconhecimento: 4 Tipos de Contribuição)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_recognitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID NOT NULL,
      to_user_id UUID NOT NULL,
      badge_type TEXT NOT NULL,
      post_id UUID,
      comment_id UUID,
      note TEXT,
      is_contested BOOLEAN DEFAULT FALSE,
      contest_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Tabela veneto_recognitions criada (Ajuda útil, Curadoria, Colaboração, Acolhimento).');

  // 7. Tabelas veneto_events, veneto_event_rsvps, veneto_event_messages (Encontros e Rituais Ao Vivo)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      event_type TEXT NOT NULL,
      ritual_day TEXT,
      host_id UUID,
      host_name TEXT DEFAULT 'Liz Design',
      starts_at TIMESTAMPTZ NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      status TEXT DEFAULT 'scheduled',
      meeting_url TEXT,
      topic_tags TEXT[] DEFAULT '{}',
      max_participants INTEGER DEFAULT 40,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_event_rsvps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL,
      user_id UUID NOT NULL,
      status TEXT DEFAULT 'confirmed',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_event_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL,
      user_id UUID NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Tabelas de Encontros (veneto_events, rsvps, messages) criadas.');

  // 8. Tabela veneto_studio_contents (Estúdio — Conteúdo Editorial e Prático da Liz)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_studio_contents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      principle TEXT,
      practical_example TEXT,
      application_prompt TEXT,
      content_body TEXT,
      media_url TEXT,
      reading_time_minutes INTEGER DEFAULT 4,
      ecosystem_pillar TEXT DEFAULT 'identidade',
      discussion_post_id UUID,
      saves_count INTEGER DEFAULT 0,
      applications_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Tabela veneto_studio_contents criada.');

  // 9. Tabela veneto_direct_messages (Mensagens Privadas com Controle de Privacidade)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_direct_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID NOT NULL,
      receiver_id UUID NOT NULL,
      content TEXT NOT NULL,
      context_label TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Tabela veneto_direct_messages criada.');

  // 10. Tabelas veneto_reports e veneto_user_blocks (Segurança, Consentimento e Moderação)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL,
      target_type TEXT NOT NULL,
      target_id UUID NOT NULL,
      reason_category TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      moderator_id UUID,
      moderator_notes TEXT,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS veneto_user_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id UUID NOT NULL,
      blocked_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(blocker_id, blocked_id)
    )
  `);
  console.log('✅ Tabelas de Segurança e Moderação (veneto_reports, veneto_user_blocks) criadas.');

  // 11. Atualizar Destinos / Espaços em community_groups para refletir a Arquitetura do Vêneto
  await sql.query(`DELETE FROM community_groups`);
  await sql.query(`
    INSERT INTO community_groups (name, slug, description, icon) VALUES
      ('Agora', 'agora', 'O fluxo principal do Vêneto: perguntas, descobertas, notas do estúdio e conversas vivas.', 'Sparkles'),
      ('Trocas', 'trocas', 'Perguntas e respostas práticas sobre posicionamento, negócios, marca e presença digital.', 'HelpCircle'),
      ('Pessoas', 'pessoas', 'Diretório de membros, competências, o que oferecem, o que procuram e oportunidades de parceria.', 'Users'),
      ('Laboratório', 'laboratorio', 'Apresente projetos em construção, peça críticas construtivas por critério e mostre evolução.', 'FlaskConical'),
      ('Encontros', 'encontros', 'Clínicas Vêneto, rodas de networking, rituais semanais e conversas sincronizadas ao vivo.', 'Calendar'),
      ('Estúdio', 'estudio', 'Notas do Estúdio, análises práticas, referenciais visuais e ferramentas curadas pela Liz Design.', 'BookOpen');
  `);
  console.log('✅ Destinos principais do Vêneto configurados em community_groups.');

  // 12. Enriquecer perfis fundadores reais (Fase de Fundação — Seção 12)
  // Buscar perfis reais para semear a fase de fundação com transparência
  const lizProfileRes = await sql.query(`SELECT id, nome FROM profiles WHERE role = 'admin' LIMIT 1`);
  const igorGestorRes = await sql.query(`SELECT id, nome FROM profiles WHERE role = 'gestor' LIMIT 1`);
  const clientsRes = await sql.query(`SELECT id, nome, username, nicho, empresa FROM profiles WHERE role = 'client' ORDER BY created_at DESC LIMIT 8`);

  const lizId = lizProfileRes[0]?.id || '55a1f766-bd50-45bd-b0bc-9af8309faa58';
  const igorId = igorGestorRes[0]?.id || 'b6b7db2f-cf71-4281-80a0-1d61edbed5fb';

  // Atualizar perfil da Liz Oliveira (Fundadora)
  await sql.query(`
    UPDATE profiles SET
      username = 'lizdesign',
      cargo = 'Fundadora',
      empresa = 'Liz Design',
      bio = 'Diretora Criativa & Fundadora da Liz Design.',
      area_atuacao = 'Fundadora & Diretora Criativa',
      segmento = 'Estúdio de Identidade Visual & Presença Digital',
      localizacao = 'Brasil',
      skills = ARRAY['Identidade Visual', 'Posicionamento de Marca', 'Direção de Arte', 'Presença Digital'],
      interesses = ARRAY['Posicionamento', 'Identidade Visual', 'Presença Digital', 'Negócios Criativos'],
      o_que_oferece = 'Direção criativa, estratégia de marca e posicionamento no ecossistema Atelier.',
      o_que_procura = 'Trocas genuínas sobre construção de marca e evolução de negócios.',
      veneto_objectives = ARRAY['Aprender e trocar experiências', 'Conhecer outros empreendedores'],
      veneto_onboarding_done = TRUE,
      dm_privacy = 'everyone',
      is_founding_member = TRUE
    WHERE id = $1
  `, [lizId]);

  // Atualizar perfil do Igor Oliveira (Gestor de Projetos)
  await sql.query(`
    UPDATE profiles SET
      username = 'igoroliveira',
      cargo = 'Gestor de Projetos',
      empresa = 'Liz Design',
      bio = 'Gestor de Projetos | LizDesign.',
      area_atuacao = 'Gestor de Projetos',
      segmento = 'Liz Design',
      localizacao = 'Brasil',
      skills = ARRAY['Gestão de Projetos', 'Processos', 'Operações'],
      interesses = ARRAY['Gestão de Projetos', 'Operações', 'Processos'],
      o_que_oferece = 'Gestão de projetos, estruturação de processos e acompanhamento estratégico no Atelier.',
      o_que_procura = 'Conexões profissionais e evolução contínua com membros da rede.',
      veneto_objectives = ARRAY['Conhecer outros empreendedores', 'Encontrar parceiros'],
      veneto_onboarding_done = TRUE,
      dm_privacy = 'everyone',
      is_founding_member = TRUE
    WHERE id = $1
  `, [igorId]);

  // Limpar placeholders pré-configurados dos demais perfis para que cada membro preencha à sua maneira
  await sql.query(`
    UPDATE profiles SET
      bio = NULL,
      area_atuacao = NULL,
      segmento = NULL,
      localizacao = NULL,
      o_que_oferece = NULL,
      o_que_procura = NULL,
      interesses = '{}',
      skills = CASE WHEN role = 'colaborador' THEN skills ELSE '{}' END,
      veneto_objectives = '{}',
      veneto_onboarding_done = FALSE,
      dm_privacy = 'none'
    WHERE id NOT IN ($1, $2)
  `, [lizId, igorId]);

  // Remover ritual e Nota das publicações existentes
  await sql.query(`UPDATE community_posts SET ritual_day = NULL`);
  await sql.query(`
    UPDATE community_posts
    SET post_type = 'discussao',
        group_slug = 'agora',
        topic_tags = ARRAY['Presença Digital', 'Posicionamento']
    WHERE author_id = $1
  `, [lizId]);

  const clientProfiles = clientsRes || [];

  // 13. Semear Publicações Fundadoras, Notas do Estúdio e Encontros (Apenas se não houver posts)
  const existingPostsCount = await sql.query(`SELECT count(*)::int as cnt FROM community_posts`);
  if ((existingPostsCount[0]?.cnt || 0) === 0) {
    console.log('🌱 Semeando Fase de Fundação (Seção 12 & 13 do briefing)...');

    const c1 = clientProfiles[0]?.id || lizId;
    const c2 = clientProfiles[1]?.id || igorId;
    const c3 = clientProfiles[2]?.id || lizId;

    // Post 1: Nota do Estúdio da Liz (QUA — Nota do Estúdio)
    const postNotaRes = await sql.query(`
      INSERT INTO community_posts (
        author_id, post_type, title, text_content, topic_tags, status, group_slug, ritual_day, is_pinned, likes_count, comments_count, saves_count, created_at
      ) VALUES (
        $1,
        'nota_estudio',
        'Uma análise prática de presença digital: por que clareza vence volume',
        'Muitas marcas tentam compensar a falta de clareza com excesso de publicações. Quando alguém entra no seu perfil ou recebe uma proposta comercial sua, essa pessoa precisa entender em menos de 10 segundos:\n\n1. Qual problema real você resolve;\n2. Por que sua abordagem é distinta das alternativas comuns;\n3. Qual é o próximo passo concreto para conversar com você.\n\nPrincípio prático desta semana: antes de criar novos formatos, revise a primeira dobra do seu perfil (bio, destaques fixados e as 3 primeiras publicações). Eles sustentam o preço que você cobra hoje?\n\nComo vocês estão trabalhando essa primeira impressão atualmente no negócio de vocês?',
        ARRAY['Presença Digital', 'Posicionamento', 'Nota do Estúdio'],
        'approved',
        'estudio',
        'QUA',
        TRUE,
        14,
        2,
        9,
        NOW() - INTERVAL '3 hours'
      ) RETURNING id;
    `, [lizId]);

    // Post 2: Dúvida Sem Resposta (Do exemplo literal da Seção 13: "Como vocês mostram o valor de um serviço sem depender de desconto?")
    const postDuvidaAbertaRes = await sql.query(`
      INSERT INTO community_posts (
        author_id, post_type, title, text_content, topic_tags, status, group_slug, is_resolved, likes_count, comments_count, saves_count, created_at
      ) VALUES (
        $1,
        'duvida',
        'Como vocês mostram o valor de um serviço sem depender de desconto?',
        'Estou revendo minha comunicação comercial e minha apresentação de proposta após o diagnóstico de marca. Percebo que quando o cliente compara apenas o preço final, é porque ainda não tangibilizou o custo de continuar com o problema.\n\nQueria conhecer exemplos práticos de outros negócios aqui no Vêneto: que elementos vocês mostram antes do preço para sustentar o valor percebido?',
        ARRAY['Comercial', 'Percepção de Valor', 'Proposta'],
        'approved',
        'trocas',
        FALSE,
        6,
        0,
        5,
        NOW() - INTERVAL '25 minutes'
      ) RETURNING id;
    `, [c1]);

    // Post 3: Dúvida já Resolvida com Solução Útil marcada (Ciclo de Valor — Seção 8)
    const postDuvidaResolvidaRes = await sql.query(`
      INSERT INTO community_posts (
        author_id, post_type, title, text_content, topic_tags, status, group_slug, is_resolved, likes_count, comments_count, saves_count, created_at
      ) VALUES (
        $1,
        'duvida',
        'Qual cadência mínima de conteúdo mantém autoridade quando a operação está cheia?',
        'Nos meses em que a entrega para clientes aperta, sinto dificuldade em manter constância diária no Instagram sem cair em posts genéricos. Como vocês equilibram profundidade editorial com uma rotina enxuta?',
        ARRAY['Rotina Editorial', 'Gestão de Instagram', 'Constância'],
        'approved',
        'trocas',
        TRUE,
        11,
        2,
        7,
        NOW() - INTERVAL '2 days'
      ) RETURNING id;
    `, [c2]);

    // Post 4: Laboratório — Pedido de Feedback Estruturado (TER — Clínica Vêneto)
    const postFeedbackRes = await sql.query(`
      INSERT INTO community_posts (
        author_id, post_type, title, text_content, topic_tags, feedback_aspects, project_stage, consent_confirmed, status, group_slug, ritual_day, likes_count, comments_count, saves_count, created_at
      ) VALUES (
        $1,
        'feedback',
        'Nova narrativa de apresentação institucional pós-rebranding',
        'Acabamos de estruturar os novos territórios da nossa identidade no Atelier e reescrevemos a apresentação de 5 páginas que enviamos antes da reunião de diagnóstico.\n\nObjetivo: substituir o tom técnico demais por uma conversa mais consultiva e direta.\n\nAdoraria ouvir a leitura de vocês especialmente sobre a clareza da promessa logo na abertura e se a transição para os casos reais gera confiança.',
        ARRAY['Laboratório', 'Narrativa Comercial', 'Identidade Visual'],
        ARRAY['Clareza da proposta', 'Posicionamento & Tom de voz', 'Estrutura comercial'],
        'Pronto para revisão',
        TRUE,
        'approved',
        'laboratorio',
        'TER',
        9,
        1,
        4,
        NOW() - INTERVAL '1 day'
      ) RETURNING id;
    `, [c3]);

    // Post 5: Parceria — Oferecer ou Buscar (Seção 5 & 6)
    await sql.query(`
      INSERT INTO community_posts (
        author_id, post_type, title, text_content, topic_tags, partnership_mode, offer_details, seek_details, status, group_slug, likes_count, comments_count, saves_count, created_at
      ) VALUES (
        $1,
        'parceria',
        'Busco parceiro de captação audiovisual mobile/estúdio e ofereço consultoria de estruturação comercial',
        'Estamos preparando uma nova série de vídeos curtos institucionais alinhados à direção visual recém-aprovada no Atelier. Procuro profissionais de captação/edição com olhar editorial e minimalista.\n\nEm contrapartida, também estou disponível para trocar experiências sobre estruturação de processo comercial B2B com membros da rede.',
        ARRAY['Parceria', 'Audiovisual', 'Comercial B2B'],
        'ambos',
        'Diagnóstico de funil comercial consultivo e revisão de proposta de alto ticket.',
        'Videomaker ou editor com estética editorial (São Paulo ou edição remota).',
        'approved',
        'pessoas',
        7,
        0,
        3,
        NOW() - INTERVAL '18 hours'
      );
    `, [c2]);

    // Post 6: Conquista / O que avançou? (SEX — O que avançou?)
    await sql.query(`
      INSERT INTO community_posts (
        author_id, post_type, title, text_content, topic_tags, status, group_slug, ritual_day, likes_count, comments_count, saves_count, created_at
      ) VALUES (
        $1,
        'conquista',
        'Aplicamos o novo posicionamento na proposta comercial e fechamos o primeiro contrato no novo ticket',
        'Quero compartilhar um avanço concreto com a rede: depois de alinhar nossa identidade visual e organizar os argumentos de percepção de valor que discutimos na última semana, apresentamos duas propostas sem oferecer desconto — e fechamos a primeira ontem.\n\nO maior aprendizado foi mostrar o processo e os bastidores de decisão antes de falar de valores.',
        ARRAY['O que avançou?', 'Conquista', 'Posicionamento'],
        'approved',
        'agora',
        'SEX',
        18,
        1,
        6,
        NOW() - INTERVAL '6 hours'
      );
    `, [c1]);

    // Inserir comentários e marcar solução útil no Post 3
    if (postDuvidaResolvidaRes[0]?.id) {
      const solComment = await sql.query(`
        INSERT INTO post_comments (post_id, user_id, content, is_solution, helpful_count, created_at)
        VALUES (
          $1,
          $2,
          'O que melhor funciona nos ciclos que acompanhamos no Atelier é definir uma "Tríade de Presença" enxuta: 3 publicações semanais com papéis fixos — 1 peça de Tese/Clareza (o que você defende), 1 peça de Bastidor/Prova (como você resolve na prática) e 1 peça de Conversa/Diagnóstico. Três peças intencionais constroem muito mais autoridade do que sete publicações feitas às pressas.',
          TRUE,
          5,
          NOW() - INTERVAL '1 day'
        ) RETURNING id;
      `, [postDuvidaResolvidaRes[0].id, lizId]);

      if (solComment[0]?.id) {
        await sql.query(`UPDATE community_posts SET resolved_comment_id = $1 WHERE id = $2`, [solComment[0].id, postDuvidaResolvidaRes[0].id]);
        await sql.query(`
          INSERT INTO post_comments (post_id, user_id, parent_id, content, is_solution, helpful_count, created_at)
          VALUES ($1, $2, $3, 'Perfeito, Liz! Reduzir para 3 peças com função clara tirou um peso enorme da semana e já deixou nosso planejamento do mês muito mais coeso.', FALSE, 2, NOW() - INTERVAL '20 hours')
        `, [postDuvidaResolvidaRes[0].id, c2, solComment[0].id]);
      }
    }

    // Comentários na Nota do Estúdio e no Laboratório
    if (postNotaRes[0]?.id) {
      await sql.query(`
        INSERT INTO post_comments (post_id, user_id, content, is_solution, helpful_count, created_at)
        VALUES
          ($1, $2, 'Fizemos esse teste ontem: trocamos a frase genérica da bio por uma promessa direta de transformação e fixamos o estudo de caso no topo. A qualidade das perguntas que chegaram no direct mudou imediatamente.', FALSE, 3, NOW() - INTERVAL '2 hours'),
          ($1, $3, 'Excelente ponto. Quem chega pela primeira vez precisa de contexto rápido — os 3 posts fixados funcionam quase como uma landing page viva dentro do Instagram.', FALSE, 2, NOW() - INTERVAL '1 hour')
      `, [postNotaRes[0].id, c1, igorId]);
    }

    if (postFeedbackRes[0]?.id) {
      await sql.query(`
        INSERT INTO post_comments (post_id, user_id, content, is_solution, helpful_count, created_at)
        VALUES ($1, $2, 'A mudança para um tom consultivo é certeira. Uma sugestão prática para a página 2: coloque um contraste "Antes vs. Depois da Clareza de Marca" antes de apresentar o escopo. Ajuda o decisor a se enxergar no cenário.', FALSE, 4, NOW() - INTERVAL '12 hours')
      `, [postFeedbackRes[0].id, lizId]);
    }
  }

  // 14. Semear Conteúdos do Estúdio da Liz (Seção 4.6 e 17)
  const existingStudioCount = await sql.query(`SELECT count(*)::int as cnt FROM veneto_studio_contents`);
  if ((existingStudioCount[0]?.cnt || 0) === 0) {
    await sql.query(`
      INSERT INTO veneto_studio_contents (
        title, category, summary, principle, practical_example, application_prompt, reading_time_minutes, ecosystem_pillar, saves_count, applications_count
      ) VALUES
      (
        'Arquitetura da Primeira Impressão: os 3 segundos que decidem a percepção de valor',
        'nota_estudio',
        'Como alinhar bio, destaques estratégicos e estética da grade para sustentar posicionamento de alto valor sem parecer inacessível.',
        'Percepção precede argumento: o cliente julga a coerência visual antes de ler o seu texto.',
        'Quando uma clínica ou consultoria usa tipografia, paleta cromática e fotografia proprietária com respiro editorial, a objeção de preço cai porque a marca transmite estrutura e permanência.',
        'Abra seu perfil como se fosse um desconhecido. Os 3 primeiros posts explicam quem você é, mostram prova real e convidam ao próximo passo? Compartilhe seu diagnóstico na conversa.',
        4,
        'mapa',
        18,
        9
      ),
      (
        'Do Brandbook para a Rotina Comercial: aplicando sua Identidade Visual além do logotipo',
        'guia_pratico',
        'Um roteiro prático para transformar os ativos do Cofre do Atelier em propostas comerciais, apresentações e pontos de contato memoráveis.',
        'Identidade visual não é adorno de post — é infraestrutura de confiança em cada ponto de contato comercial.',
        'Negócios que padronizam proposta comercial, assinatura visual de documentos e experiência de onboarding aumentam a taxa de conversão porque eliminam o ruído entre a promessa no Instagram e a entrega real.',
        'Escolha um ponto de contato comercial (proposta em PDF, apresentação ou página de boas-vindas) e aplique sua direção visual esta semana. Publique no Laboratório para receber feedback.',
        6,
        'identidade',
        24,
        12
      ),
      (
        'A Tríade Editorial da Gestão de Presença: Autoridade, Bastidor e Conversão',
        'analise_marca',
        'Por que publicar menos com intenção estratégica gera mais negócios qualificados do que perseguir alcance viral vazio.',
        'Alcance sem alinhamento atrai curiosos; clareza editorial atrai decisores.',
        'Ao equilibrar conteúdos que educam o critério de escolha do cliente (Autoridade), mostram o rigor do processo (Bastidor) e abrem portas claras de contato (Conversão), o feed deixa de ser vitrine passiva e vira ativo comercial.',
        'Classifique suas últimas 6 publicações nessas três categorias. Qual pilar está faltando hoje na sua presença digital?',
        5,
        'gestao',
        21,
        14
      ),
      (
        'Como pedir e oferecer Feedback de Marca com maturidade profissional',
        'ferramenta',
        'Framework do Laboratório Vêneto para avaliar projetos de outros membros com foco em objetivo de negócio, público e coerência.',
        'Bom feedback não é gosto pessoal ("eu mudaria essa cor"); é leitura estratégica baseada em contexto e objetivo.',
        'Antes de opinar sobre uma peça no Laboratório, verifique: 1) Quem é o comprador? 2) Qual sensação a marca precisa despertar? 3) Onde a mensagem está ambígua?',
        'Use estes 3 critérios ao avaliar um projeto aberto hoje no Laboratório do Vêneto.',
        3,
        'atelier',
        15,
        11
      );
    `);
    console.log('✅ Biblioteca do Estúdio da Liz semeada.');
  }

  // 15. Semear Encontros & Rituais da Semana (Seção 7)
  const existingEventsCount = await sql.query(`SELECT count(*)::int as cnt FROM veneto_events`);
  if ((existingEventsCount[0]?.cnt || 0) === 0) {
    await sql.query(`
      INSERT INTO veneto_events (
        title, subtitle, description, event_type, ritual_day, host_id, host_name, starts_at, duration_minutes, status, topic_tags, max_participants
      ) VALUES
      (
        'Clínica Vêneto: Diagnóstico de Posicionamento e Proposta Comercial',
        'Ritual de Terça · Análise colaborativa de caso real',
        'Um membro fundador apresenta um desafio real de marca, comunicação ou conversão. A Liz Design e a comunidade constroem diagnósticos e alternativas aplicáveis em tempo real.',
        'clinica_marca',
        'TER',
        $1,
        'Liz Design',
        NOW() + INTERVAL '1 day',
        60,
        'scheduled',
        ARRAY['Clínica Vêneto', 'Posicionamento', 'Feedback Ao Vivo'],
        35
      ),
      (
        'Encontro Aberto: Roda de Conexões & Negócios Complementares',
        'Ritual de Quinta · Networking estruturado sem autopromoção vazia',
        'Sessão sincronizada em horário programado para apresentar o que seu negócio está construindo, que tipo de parceiro procura e onde pode colaborar com outros membros do Atelier.',
        'roda_networking',
        'QUI',
        $1,
        'Liz Design & Equipe Atelier',
        NOW() + INTERVAL '3 days',
        45,
        'scheduled',
        ARRAY['Encontro Aberto', 'Networking', 'Parcerias'],
        50
      ),
      (
        'Sessão do Estúdio: Revisão de Presença Digital & 1ª Dobra do Perfil',
        'Conversa ao vivo + Chat sincronizado',
        'Leitura prática de perfis de membros voluntários com base nos critérios do Mapa e da Gestão de Presença da Liz Design.',
        'sessao_especialista',
        'QUA',
        $1,
        'Liz Design',
        NOW() + INTERVAL '5 days',
        60,
        'scheduled',
        ARRAY['Estúdio', 'O Mapa', 'Instagram'],
        40
      );
    `, [lizId]);
    console.log('✅ Calendário de Encontros e Rituais semeado.');
  }

  // 16. Semear Reconhecimentos Iniciais Transparentes (Seção 10)
  const existingRecCount = await sql.query(`SELECT count(*)::int as cnt FROM veneto_recognitions`);
  if ((existingRecCount[0]?.cnt || 0) === 0 && clientProfiles.length >= 2) {
    await sql.query(`
      INSERT INTO veneto_recognitions (from_user_id, to_user_id, badge_type, note) VALUES
      ($1, $2, 'ajuda_util', 'Síntese prática da Tríade de Presença que destravou nosso calendário editorial.'),
      ($2, $1, 'colaboracao', 'Compartilhou abertamente os aprendizados da nova proposta comercial com a comunidade.'),
      ($2, $3, 'acolhimento', 'Recepção ativa e conexão entre os membros fundadores na chegada ao Vêneto.'),
      ($3, $2, 'curadoria', 'Notas do Estúdio e referências de posicionamento de altíssimo nível técnico.');
    `, [clientProfiles[0].id, lizId, igorId]);
    console.log('✅ Camada de Reconhecimentos semeada.');
  }

  // 17. Semear oportunidades em b2b_pitches se estiver vazio
  const existingPitches = await sql.query(`SELECT count(*)::int as cnt FROM b2b_pitches`);
  if ((existingPitches[0]?.cnt || 0) === 0 && clientProfiles.length >= 2) {
    await sql.query(`
      INSERT INTO b2b_pitches (author_id, type, title, company, location, budget, description, tags) VALUES
      ($1, 'demand', 'Parceiro de Captação e Edição de Vídeos Editoriais (Reels)', 'Marca Fundadora Vêneto', 'São Paulo / Remoto', 'Sob proposta', 'Buscamos filmmaker ou editor alinhado à direção estética minimalista desenvolvida no Atelier para produção quinzenal de conteúdo.', ARRAY['Audiovisual', 'Edição Editorial', 'Reels']),
      ($2, 'offer', 'Diagnóstico de Estrutura Comercial & Apresentação de Alto Ticket', 'Consultoria Estratégica', 'Remoto · Brasil', 'Condição especial para membros Vêneto', 'Ofereço revisão completa do roteiro de reunião comercial e apresentação de proposta para negócios de serviços que acabaram de renovar sua identidade visual.', ARRAY['Comercial', 'Vendas Consultivas', 'Alto Ticket']);
    `, [clientProfiles[0].id, clientProfiles[1].id]);
    console.log('✅ Oportunidades iniciais de parceria semeadas.');
  }

  console.log('🎉 Migração do banco de dados concluída com sucesso!');
}

migrateVeneto().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
