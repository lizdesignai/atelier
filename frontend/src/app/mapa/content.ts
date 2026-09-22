export interface StageContent {
  id: number;
  dimensao: string;
  resultado_esperado: string;
  contexto: {
    title: string;
    subtitle: string;
    copy: string;
  };
  aula: {
    title: string;
    videoUrl?: string;
    timestamps?: { time: string; label: string }[];
  };
  microCheck?: {
    perguntas: { pergunta: string; opcoes: { texto: string; correta: boolean }[] }[];
  };
  missao: {
    title: string;
    description: string;
    tarefas: { 
      id: string; 
      texto: string; 
      impacto: 'alto' | 'médio' | 'baixo'; 
      esforco: 'alto' | 'médio' | 'baixo';
      tempo_estimado?: string;
      criterio?: string;
      tipo_evidencia?: string;
    }[];
  };
  evidencia: {
    title: string;
    description: string;
    placeholder: string;
    acceptsImage: boolean;
  };
  checkpoint: {
    title: string;
    perguntas: { pergunta: string; opcoes: { texto: string; correta: boolean }[] }[];
  };
  correcao?: {
    conceitos: { titulo: string; resumo: string }[];
  };
  descoberta: string;
}

export const MAPA_STAGES_CONTENT: Record<number, StageContent> = {
  1: {
    id: 1,
    dimensao: 'Clareza',
    resultado_esperado: 'Seu negócio pode ser compreendido em 3 segundos.',
    contexto: {
      title: 'A Base da Comunicação',
      subtitle: 'Antes de querer atenção, você precisa ser entendido.',
      copy: 'A maior parte dos perfis falha porque tenta parecer interessante antes de ser claro. A sua audiência tem 3 segundos para entender o que você faz. Se houver ruído na promessa, eles vão embora.'
    },
    aula: {
      title: 'Sistema de Clareza: Eliminando o Ruído',
      timestamps: [
        { time: '00:00', label: 'O problema da falta de clareza' },
        { time: '02:30', label: 'Framework: Transformação vs. Ferramenta' },
        { time: '08:15', label: 'Como estruturar uma bio impossível de ignorar' }
      ]
    },
    microCheck: {
      perguntas: [
        {
          pergunta: 'O maior erro na comunicação de uma oferta é focar em:',
          opcoes: [
            { texto: 'Ferramentas e processos, em vez do resultado final.', correta: true },
            { texto: 'Falar muito sobre os clientes anteriores.', correta: false },
            { texto: 'Tentar ser muito direto no que vende.', correta: false }
          ]
        },
        {
          pergunta: 'Uma bio clara deve responder imediatamente a:',
          opcoes: [
            { texto: 'O que você faz e quem você ajuda.', correta: true },
            { texto: 'Qual faculdade você cursou e quantos anos de experiência tem.', correta: false },
            { texto: 'Frases de efeito que demonstram autoridade abstrata.', correta: false }
          ]
        }
      ]
    },
    missao: {
      title: 'Ajustes de Fundação',
      description: 'Execute estas tarefas no seu perfil hoje.',
      tarefas: [
        { id: 't1_bio', texto: 'Reescrever a bio focada na transformação (O que faz e para quem).', impacto: 'alto', esforco: 'baixo', tempo_estimado: '~20 minutos', criterio: 'Explicar a oferta em até 160 caracteres.', tipo_evidencia: 'Texto da nova bio' },
        { id: 't1_oferta', texto: 'Definir 1 oferta principal (Qual é o seu produto/serviço carro-chefe?).', impacto: 'alto', esforco: 'médio', tempo_estimado: '~30 minutos', criterio: 'Nome claro do serviço + principal promessa.', tipo_evidencia: 'Link ou descrição da oferta' },
        { id: 't1_cta', texto: 'Ajustar a Call-to-Action da bio (O que a pessoa deve fazer a seguir?).', impacto: 'alto', esforco: 'baixo' },
        { id: 't1_link', texto: 'Simplificar o link da bio (Apenas os links essenciais).', impacto: 'médio', esforco: 'baixo' }
      ]
    },
    evidencia: {
      title: 'Sua Nova Promessa',
      description: 'Escreva abaixo como ficou a sua nova Bio e a sua oferta principal. Isto será analisado para validar a sua clareza.',
      placeholder: 'Minha nova bio ficou assim...',
      acceptsImage: true
    },
    checkpoint: {
      title: 'Auditoria de Clareza',
      perguntas: [
        {
          pergunta: 'Se um estranho entrar no seu perfil agora, ele descobre o que você vende em quantos segundos?',
          opcoes: [
            { texto: 'Em menos de 3 segundos, está na primeira linha da bio.', correta: true },
            { texto: 'Ele precisa ler alguns posts para entender.', correta: false },
            { texto: 'Ele precisa clicar no link e ler a página.', correta: false }
          ]
        },
        {
          pergunta: 'A sua bio está focada em quem?',
          opcoes: [
            { texto: 'Na transformação que eu gero para o meu cliente.', correta: true },
            { texto: 'No meu currículo e nas minhas formações.', correta: false },
            { texto: 'Em frases motivacionais genéricas.', correta: false }
          ]
        }
      ]
    },
    correcao: {
      conceitos: [
        { titulo: 'A Regra dos 3 Segundos', resumo: 'Se o usuário não entender o que você faz em 3 segundos lendo a sua bio, você perde a atenção dele. Reescreva a primeira linha.' },
        { titulo: 'Foco no Cliente', resumo: 'Pare de falar sobre você (ferramentas, currículo) e comece a falar sobre o resultado que o seu serviço gera na vida de quem paga você.' }
      ]
    },
    descoberta: "A clareza atrai. A confusão afasta. O seu perfil agora tem uma promessa clara."
  },
  2: {
    id: 2,
    dimensao: 'Percepção',
    resultado_esperado: 'Sua apresentação visual é coerente com o valor que comunica.',
    contexto: {
      title: 'Sintaxe Visual',
      subtitle: 'O que a sua marca parece antes mesmo de alguém ler.',
      copy: 'Nós julgamos um livro pela capa. E julgamos um serviço pelo design. A percepção de valor (se você cobra caro ou barato) é definida pela qualidade visual do seu perfil.'
    },
    aula: {
      title: 'Alinhando a Estética ao Preço',
    },
    missao: {
      title: 'Auditoria Visual',
      description: 'Garanta que a estética não destrói a sua autoridade.',
      tarefas: [
        { id: 't2_sistema_visual', texto: 'Definir uma paleta de 3 cores principais consistentes.', impacto: 'alto', esforco: 'alto' },
        { id: 't2_padronizar', texto: 'Padronizar as capas dos destaques.', impacto: 'médio', esforco: 'médio' },
        { id: 't2_aplicar', texto: 'Arquivar os últimos 3 posts que destroem o padrão visual.', impacto: 'alto', esforco: 'baixo' }
      ]
    },
    evidencia: {
      title: 'Mudança de Pele',
      description: 'Descreva a principal mudança estética que você decidiu aplicar, ou faça upload de um print do novo feed.',
      placeholder: 'Decidi remover as fontes em negrito e usar tons mais sóbrios...',
      acceptsImage: true
    },
    checkpoint: {
      title: 'Check de Sintaxe Visual',
      perguntas: [
        {
          pergunta: 'Se eu tampar a sua foto de perfil e o seu nome, as pessoas reconhecem um post seu pela estética?',
          opcoes: [
            { texto: 'Sim, eu tenho cores, fontes e estilo fotográfico definidos.', correta: true },
            { texto: 'Não, cada post parece ser de uma pessoa diferente.', correta: false }
          ]
        },
        {
          pergunta: 'A sua foto de perfil atual transmite qual mensagem?',
          opcoes: [
            { texto: 'Amadorismo (selfie no espelho, fundo confuso).', correta: false },
            { texto: 'Intencionalidade (iluminação, postura e contexto alinhados ao meu serviço).', correta: true }
          ]
        }
      ]
    },
    descoberta: "A estética é um filtro natural. Agora a sua marca parece o que ela realmente vale."
  },
  3: {
    id: 3,
    dimensao: 'Autoridade',
    resultado_esperado: 'Seu perfil apresenta evidências concretas da sua competência.',
    contexto: {
      title: 'Provas e Casos',
      subtitle: 'Autoridade não é dizer que você é bom. É provar.',
      copy: 'Você pode gritar que é o melhor, ou pode deixar os seus resultados falarem por você. A autoridade é um gatilho construído através de método, prova social e cases de sucesso estruturados.'
    },
    aula: {
      title: 'O Banco de Autoridade',
    },
    missao: {
      title: 'Construção de Provas',
      description: 'Transforme elogios soltos em cases de sucesso.',
      tarefas: [
        { id: 't3_caso', texto: 'Documentar 1 caso de sucesso recente (Antes/Depois/Resultado).', impacto: 'alto', esforco: 'alto' },
        { id: 't3_provas', texto: 'Reunir 3 depoimentos/prints de clientes em um destaque específico.', impacto: 'alto', esforco: 'médio' },
        { id: 't3_metodo', texto: 'Criar 1 post (ou sequência de stories) explicando o SEU método.', impacto: 'médio', esforco: 'alto' },
        { id: 't3_destaque', texto: 'Montar um destaque "Comece Aqui" ou "Quem sou eu".', impacto: 'alto', esforco: 'médio' }
      ]
    },
    evidencia: {
      title: 'Sua Prova',
      description: 'Qual foi o case de sucesso que documentou hoje? Desuma em 2 frases o "Antes" e o "Depois".',
      placeholder: 'Antes o cliente faturava X, depois de aplicarmos o método, faturou Y...',
      acceptsImage: true
    },
    checkpoint: {
      title: 'Auditoria de Peso',
      perguntas: [
        {
          pergunta: 'Onde estão as suas provas sociais hoje?',
          opcoes: [
            { texto: 'Perdidas no WhatsApp ou eu não peço.', correta: false },
            { texto: 'Fixadas num destaque estratégico e publicadas no feed mensalmente.', correta: true }
          ]
        },
        {
          pergunta: 'As pessoas entendem como você resolve o problema delas?',
          opcoes: [
            { texto: 'Sim, eu falo sobre o meu método autoral e não só sobre o produto.', correta: true },
            { texto: 'Não, eu só falo "compre o meu serviço".', correta: false }
          ]
        }
      ]
    },
    descoberta: "Quando a prova fala alto, você não precisa convencer ninguém. A venda acontece naturalmente."
  },
  4: {
    id: 4,
    dimensao: 'Conversão',
    resultado_esperado: 'Existe um caminho explícito entre descoberta e próxima ação.',
    contexto: {
      title: 'O Caminho da Venda',
      subtitle: 'Seu perfil não precisa convencer todo mundo. Precisa deixar claro o próximo passo.',
      copy: 'Você atrai (Clareza), retém pela estética (Percepção) e gera confiança (Autoridade). Mas se o cliente não souber onde clicar para comprar, você perde dinheiro. Conversão é sobre atrito zero.'
    },
    aula: {
      title: 'Arquitetura de Conversão',
    },
    missao: {
      title: 'Caminho de Compra Fluido',
      description: 'Remova os atritos entre o cliente e o checkout.',
      tarefas: [
        { id: 't4_oferta', texto: 'Estruturar o produto/serviço em um link direto.', impacto: 'alto', esforco: 'alto' },
        { id: 't4_cta', texto: 'Padronizar a chamada de fim de funil (posts de venda clara).', impacto: 'alto', esforco: 'médio' },
        { id: 't4_caminho', texto: 'Testar clicar no seu próprio link da bio como se fosse um cliente.', impacto: 'médio', esforco: 'baixo' },
        { id: 't4_link', texto: 'Garantir que a primeira opção do linktree seja a mais importante.', impacto: 'alto', esforco: 'baixo' }
      ]
    },
    evidencia: {
      title: 'O Funil',
      description: 'Qual é o exato passo a passo que um seguidor faz até pagar a você hoje?',
      placeholder: 'Ele clica na bio > vai para WhatsApp > envio PDF comercial > enviamos link do Stripe...',
      acceptsImage: false
    },
    checkpoint: {
      title: 'Check de Fricção',
      perguntas: [
        {
          pergunta: 'Se eu quiser lhe pagar agora, qual é o nível de dificuldade?',
          opcoes: [
            { texto: 'Difícil. Precisa me mandar direct, esperar eu responder e pedir orçamentos.', correta: false },
            { texto: 'Fácil. Tem um link direto para a página de vendas ou um formulário de aplicação automatizado.', correta: true }
          ]
        },
        {
          pergunta: 'Qual a proporção de posts de venda vs. conteúdo no seu feed?',
          opcoes: [
            { texto: 'Eu nunca vendo, tenho medo de ser chato.', correta: false },
            { texto: 'Eu vendo ativamente. Pelo menos 20% do conteúdo é chamando para conversão.', correta: true }
          ]
        }
      ]
    },
    descoberta: "Conversão não é sobre ser agressivo. É sobre não ser um obstáculo no caminho do próprio cliente."
  }
};
