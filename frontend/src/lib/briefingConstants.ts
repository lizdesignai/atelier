// frontend/src/lib/briefingConstants.ts

/**
 * Mapeamento unificado de todas as perguntas de Briefing de Identidade Visual
 * (Suporta as 80 perguntas novas do novo formulário expandido e as chaves legadas).
 */
export const BRIEFING_LABELS: Record<string, string> = {
  // Informações Centrais & Contato
  nome_cliente: "Nome do Responsável",
  Nome_Cliente: "Nome do Responsável",
  nome: "Nome do Responsável",
  Nome: "Nome do Responsável",
  nome_marca: "Nome da Marca",
  Nome_Marca: "Nome da Marca",
  nome_logotipo: "Nome no Logotipo",
  Nome_Logotipo: "Nome no Logotipo",
  nome_logo: "Nome no Logotipo",
  whatsapp: "WhatsApp de Contato",
  WhatsApp: "WhatsApp de Contato",
  email: "E-mail de Contato",
  Email: "E-mail de Contato",
  tagline: "Tagline (Subtítulo)",
  Tagline: "Tagline (Subtítulo)",
  slogan: "Slogan Corporativo",
  Slogan: "Slogan Corporativo",
  status_marca: "Status Atual da Marca",
  Status_Marca: "Status Atual da Marca",

  // Fundação, Origem & Propósito
  motivo_nascimento: "O que motivou o nascimento da marca?",
  Motivo_Nascimento: "O que motivou o nascimento da marca?",
  motivo_escolha_negocio: "Por que escolheu esse tipo de negócio?",
  Motivo_Escolha_Negocio: "Por que escolheu esse tipo de negócio?",
  historia_importante: "Existe alguma história importante por trás?",
  Historia_Importante: "Existe alguma história importante por trás?",
  tem_significado_nome: "O nome tem algum significado especial?",
  Tem_Significado_Nome: "O nome tem algum significado especial?",
  significado_nome: "Significado do Nome",
  Significado_Nome: "Significado do Nome",
  conceito_inseparavel: "Conceito Inseparável da Marca",
  Conceito_Inseparavel: "Conceito Inseparável da Marca",
  frase_resumo: "Frase que resume a essência da marca",
  Frase_Resumo: "Frase que resume a essência da marca",
  pitch_10s: "Pitch de 10 Segundos (O que faz e para quem)",
  Pitch_10s: "Pitch de 10 Segundos (O que faz e para quem)",
  unica_coisa_resolver: "Principal Problema / Dor a Resolver",
  Unica_Coisa_Resolver: "Principal Problema / Dor a Resolver",
  motivo_abertura: "Por que a empresa foi aberta?",
  Motivo_Abertura: "Por que a empresa foi aberta?",
  proposito: "Propósito da Marca (Além do Lucro)",
  Proposito: "Propósito da Marca (Além do Lucro)",
  missao: "Missão da Marca",
  Missao: "Missão da Marca",

  // Oferta & Negócio
  o_que_vende: "O que a marca vende?",
  O_Que_Vende: "O que a marca vende?",
  produtos_servicos: "Produtos ou Serviços Oferecidos",
  Produtos_Servicos: "Produtos ou Serviços Oferecidos",
  tipo_produto: "Tipo de Produto / Serviço",
  Tipo_Produto: "Tipo de Produto / Serviço",
  tipo_produto_outro: "Tipo de Produto (Detalhe)",
  Tipo_Produto_Outro: "Tipo de Produto (Detalhe)",
  motivo_compra: "Por que os clientes compram de você?",
  Motivo_Compra: "Por que os clientes compram de você?",
  diferenca_outros: "O que diferencia a marca das demais?",
  Diferenca_Outros: "O que diferencia a marca das demais?",
  algo_diferente: "Algo Diferente que Gostaria de Oferecer",
  Algo_Diferente: "Algo Diferente que Gostaria de Oferecer",
  diferenca_percebida: "Como a marca é percebida em relação aos concorrentes",
  Diferenca_Percebida: "Como a marca é percebida em relação aos concorrentes",
  diferencial: "Diferencial Competitivo",
  Diferencial: "Diferencial Competitivo",
  tempo_mercado: "Tempo de Mercado",
  Tempo_Mercado: "Tempo de Mercado",

  // Público & Cliente Ideal
  perfil_cliente: "Perfil do Cliente Ideal",
  Perfil_Cliente: "Perfil do Cliente Ideal",
  problema_cliente: "Maior Dor / Problema que a marca resolve",
  Problema_Cliente: "Maior Dor / Problema que a marca resolve",
  influencia_compra: "O que mais influencia a decisão de compra?",
  Influencia_Compra: "O que mais influencia a decisão de compra?",
  influencia_compra_outro: "Influência de Compra (Detalhe)",
  Influencia_Compra_Outro: "Influência de Compra (Detalhe)",
  sentimento_desejado: "Sentimento desejado ao interagir com a marca",
  Sentimento_Desejado: "Sentimento desejado ao interagir com a marca",
  sentimento_desejado_outro: "Sentimento Desejado (Detalhe)",
  Sentimento_Desejado_Outro: "Sentimento Desejado (Detalhe)",
  cliente_indesejado: "Tipo de Cliente que NÃO deseja atrair",
  Cliente_Indesejado: "Tipo de Cliente que NÃO deseja atrair",
  resumo_publico: "Resumo Comportamental do Público",
  Resumo_Publico: "Resumo Comportamental do Público",
  genero_publico: "Gênero do Público Predominante",
  Genero_Publico: "Gênero do Público Predominante",
  genero: "Gênero do Público Predominante",
  genero_publico_outro: "Gênero do Público (Detalhe)",
  Genero_Publico_Outro: "Gênero do Público (Detalhe)",
  genero_outro: "Gênero do Público (Detalhe)",
  classe_social: "Classe Social Predominante",
  Classe_Social: "Classe Social Predominante",
  classe: "Classe Social Predominante",
  classe_social_outro: "Classe Social (Detalhe)",
  Classe_Social_Outro: "Classe Social (Detalhe)",
  classe_outro: "Classe Social (Detalhe)",
  idade_publico: "Faixa Etária do Público",
  Idade_Publico: "Faixa Etária do Público",
  idade: "Faixa Etária do Público",
  idade_publico_outro: "Faixa Etária (Detalhe)",
  Idade_Publico_Outro: "Faixa Etária (Detalhe)",
  idade_outro: "Faixa Etária (Detalhe)",
  sentimento_consumidor: "Sentimento Esperado pelo Consumidor",
  Sentimento_Consumidor: "Sentimento Esperado pelo Consumidor",
  sentimento_empresa: "O Sentimento Core que a Marca Vende",
  Sentimento_Empresa: "O Sentimento Core que a Marca Vende",
  sentimento: "O Sentimento Core que a Marca Vende",

  // Mercado & Concorrência
  concorrentes: "Principais Concorrentes",
  Concorrentes: "Principais Concorrentes",
  links_concorrentes: "Links dos Concorrentes",
  Links_Concorrentes: "Links dos Concorrentes",
  concorrentes_links: "Links dos Concorrentes",
  concorrentes_bom: "O que os Concorrentes fazem de bom?",
  Concorrentes_Bom: "O que os Concorrentes fazem de bom?",
  fazer_diferente: "O que fará de diferente da concorrência?",
  Fazer_Diferente: "O que fará de diferente da concorrência?",
  evitar_mercado: "O que deseja EVITAR do mercado atual?",
  Evitar_Mercado: "O que deseja EVITAR do mercado atual?",
  o_que_nao_fazer: "O que definitivamente NÃO fazer",
  O_Que_Nao_Fazer: "O que definitivamente NÃO fazer",
  nao_fazer: "O que definitivamente NÃO fazer",

  // Personalidade & Atributos
  emoji_empresa: "Emojis que Definem a Marca",
  Emoji_Empresa: "Emojis que Definem a Marca",
  emoji: "Emojis que Definem a Marca",
  musica_empresa: "Música que Traduz a Essência",
  Musica_Empresa: "Música que Traduz a Essência",
  musica: "Música que Traduz a Essência",
  atributos_gerais: "Atributos Gerais da Marca",
  Atributos_Gerais: "Atributos Gerais da Marca",
  atributos_gerais_outro: "Atributos Gerais (Detalhe)",
  Atributos_Gerais_Outro: "Atributos Gerais (Detalhe)",
  atributos_top3: "Top 3 Atributos Principais",
  Atributos_Top3: "Top 3 Atributos Principais",
  top_3_adjetivos: "Top 3 Adjetivos",
  Top_3_Adjetivos: "Top 3 Adjetivos",
  adjetivos_positivos: "Adjetivos Positivos (A Marca É)",
  Adjetivos_Positivos: "Adjetivos Positivos (A Marca É)",
  adjetivos_positivos_outro: "Adjetivos Positivos (Detalhe)",
  Adjetivos_Positivos_Outro: "Adjetivos Positivos (Detalhe)",
  atributos_nao_transmitir: "Atributos que a marca NÃO deve transmitir",
  Atributos_Nao_Transmitir: "Atributos que a marca NÃO deve transmitir",
  atributos_nao_transmitir_outro: "Atributos a NÃO Transmitir (Detalhe)",
  Atributos_Nao_Transmitir_Outro: "Atributos a NÃO Transmitir (Detalhe)",
  adjetivos_negativos: "Adjetivos Negativos (A Marca NÃO É)",
  Adjetivos_Negativos: "Adjetivos Negativos (A Marca NÃO É)",
  adjetivos_negativos_outro: "Adjetivos Negativos (Detalhe)",
  Adjetivos_Negativos_Outro: "Adjetivos Negativos (Detalhe)",
  porque_atributos: "Por que esses atributos foram escolhidos?",
  Porque_Atributos: "Por que esses atributos foram escolhidos?",
  sentimento_marca: "Sentimento Exigido da Marca",
  Sentimento_Marca: "Sentimento Exigido da Marca",

  // Eixos Estratégicos (1 a 5)
  eixo_tradicional_contemporanea: "Eixo: Tradicional (1) ↔ Contemporânea (5)",
  Eixo_Tradicional_Contemporanea: "Eixo: Tradicional (1) ↔ Contemporânea (5)",
  eixo_seria_descontraida: "Eixo: Séria (1) ↔ Descontraída (5)",
  Eixo_Seria_Descontraida: "Eixo: Séria (1) ↔ Descontraída (5)",
  eixo_acessivel_exclusiva: "Eixo: Acessível (1) ↔ Exclusiva (5)",
  Eixo_Acessivel_Exclusiva: "Eixo: Acessível (1) ↔ Exclusiva (5)",
  eixo_discreta_ousada: "Eixo: Discreta (1) ↔ Ousada (5)",
  Eixo_Discreta_Ousada: "Eixo: Discreta (1) ↔ Ousada (5)",
  eixo_racional_emocional: "Eixo: Racional (1) ↔ Emocional (5)",
  Eixo_Racional_Emocional: "Eixo: Racional (1) ↔ Emocional (5)",
  eixo_minimalista_expressiva: "Eixo: Minimalista (1) ↔ Expressiva (5)",
  Eixo_Minimalista_Expressiva: "Eixo: Minimalista (1) ↔ Expressiva (5)",

  // Percepção & Posicionamento
  percepcao_primeiravez: "Primeira Impressão Desejada (Ao bater o olho)",
  Percepcao_PrimeiraVez: "Primeira Impressão Desejada (Ao bater o olho)",
  percepcao_poscompra: "Percepção Pós-Compra (Após a entrega)",
  Percepcao_PosCompra: "Percepção Pós-Compra (Após a entrega)",
  percepcao_indesejada: "Percepção que Deseja Evitar",
  Percepcao_Indesejada: "Percepção que Deseja Evitar",
  falta_marca: "O que sente que falta na marca hoje?",
  Falta_Marca: "O que sente que falta na marca hoje?",
  validacao_espelho: "A identidade atual reflete quem você/a marca é?",
  Validacao_Espelho: "A identidade atual reflete quem você/a marca é?",
  ajustes_espelho: "Ajustes necessários no espelho da marca",
  Ajustes_Espelho: "Ajustes necessários no espelho da marca",

  // Universo Visual, Referências & Cores
  marcas_admiradas: "Marcas e Perfis que Admira",
  Marcas_Admiradas: "Marcas e Perfis que Admira",
  referencias_inspiracoes: "Referências Visuais e Inspirações",
  Referencias_Inspiracoes: "Referências Visuais e Inspirações",
  referencias: "Referências Visuais e Inspirações",
  gosto_referencias: "O que mais gosta nas referências visuais",
  Gosto_Referencias: "O que mais gosta nas referências visuais",
  gosto_referencias_outro: "Referências Visuais (Detalhe)",
  Gosto_Referencias_Outro: "Referências Visuais (Detalhe)",
  marcas_nao_admiradas: "Marcas ou Perfis que NÃO Admira",
  Marcas_Nao_Admiradas: "Marcas ou Perfis que NÃO Admira",
  nao_gosto_referencias: "O que NÃO gosta nessas referências",
  Nao_Gosto_Referencias: "O que NÃO gosta nessas referências",
  ambiente_proximo: "Ambiente Físico ou Atmosfera Mais Próxima",
  Ambiente_Proximo: "Ambiente Físico ou Atmosfera Mais Próxima",
  ambiente_proximo_outro: "Ambiente Próximo (Detalhe)",
  Ambiente_Proximo_Outro: "Ambiente Próximo (Detalhe)",
  atmosfera_combinada: "Atmosfera que Mais Combina com a Marca",
  Atmosfera_Combinada: "Atmosfera que Mais Combina com a Marca",
  universo_evitar: "Universo Visual ou Estilo a EVITAR",
  Universo_Evitar: "Universo Visual ou Estilo a EVITAR",
  cor_desejada_opcao: "Tem Preferência por Alguma Cor?",
  Cor_Desejada_Opcao: "Tem Preferência por Alguma Cor?",
  cor_desejada_qual: "Cores Desejadas",
  Cor_Desejada_Qual: "Cores Desejadas",
  cor_desejada: "Cores Desejadas",
  Cor_Desejada: "Cores Desejadas",
  cor_indesejada: "Cores Proibidas / Indesejadas",
  Cor_Indesejada: "Cores Proibidas / Indesejadas",
  cor_nao_desejada: "Cores Proibidas / Indesejadas",
  Cor_Nao_Desejada: "Cores Proibidas / Indesejadas",
  simbolo_desejado: "Símbolo Desejado (Ícone/Elemento)",
  Simbolo_Desejado: "Símbolo Desejado (Ícone/Elemento)",
  simbolo_especifico: "Pedido de Símbolo Específico",
  Simbolo_Especifico: "Pedido de Símbolo Específico",
  simbolo: "Pedido de Símbolo Específico",
  simbolo_indesejado: "Símbolo Indesejado (Evitar)",
  Simbolo_Indesejado: "Símbolo Indesejado (Evitar)",
  identidade_preservar: "O que Preservar da Identidade Atual",
  Identidade_Preservar: "O que Preservar da Identidade Atual",
  identidade_abandonar: "O que Abandonar da Identidade Atual",
  Identidade_Abandonar: "O que Abandonar da Identidade Atual",
  sobre_logo_atual: "Sobre o Logotipo Atual",
  Sobre_Logo_Atual: "Sobre o Logotipo Atual",
  logo_atual: "Sobre o Logotipo Atual",

  // Aplicações, Futuro & Escolha
  aplicacoes: "Onde a Identidade Visual será aplicada",
  Aplicacoes: "Onde a Identidade Visual será aplicada",
  onde_verao_identidade: "Onde Verão a Identidade Visual",
  Onde_Verao_Identidade: "Onde Verão a Identidade Visual",
  onde_verao: "Onde Verão a Identidade Visual",
  aplicacoes_outro: "Aplicações (Detalhe)",
  Aplicacoes_Outro: "Aplicações (Detalhe)",
  aplicacao_principal: "Aplicação Mais Importante / Principal",
  Aplicacao_Principal: "Aplicação Mais Importante / Principal",
  aplicacao_especial: "Aplicação Especial ou Específica",
  Aplicacao_Especial: "Aplicação Especial ou Específica",
  empresa_hoje: "Estágio da Empresa Hoje",
  Empresa_Hoje: "Estágio da Empresa Hoje",
  empresa_5_anos: "Onde a Empresa estará em 5 Anos",
  Empresa_5_Anos: "Onde a Empresa estará em 5 Anos",
  visao_5_anos: "Visão de Futuro (Em 5 Anos)",
  Visao_5_Anos: "Visão de Futuro (Em 5 Anos)",
  representacao_futuro: "O que a marca representa para o futuro",
  Representacao_Futuro: "O que a marca representa para o futuro",
  expansao: "Planos de Expansão",
  Expansao: "Planos de Expansão",
  como_expandir: "Como Pretende Expandir",
  Como_Expandir: "Como Pretende Expandir",
  motivo_escolha: "Por que Escolheu o Atelier / Liziane",
  Motivo_Escolha: "Por que Escolheu o Atelier / Liziane",
  motivo_escolha_liz: "Por que Escolheu o Atelier / Liziane",
  Motivo_Escolha_Liz: "Por que Escolheu o Atelier / Liziane",
  consideracoes_finais: "Considerações Finais e Observações",
  Consideracoes_Finais: "Considerações Finais e Observações",
  ideias_livres: "Considerações Finais e Observações",
  ideias_livres_extras: "Considerações Finais e Observações",
  Ideias_Livres_Extras: "Considerações Finais e Observações"
};

/**
 * Mapeamento unificado de Orçamentos (Identidade Visual e Gerenciamento de Instagram)
 */
export const FORM_LABELS: Record<string, string> = {
  // Dados de Contato e Perfil
  nome: "Nome do Prospect",
  Nome: "Nome do Prospect",
  email: "E-mail de Contato",
  Email: "E-mail de Contato",
  whatsapp: "WhatsApp",
  WhatsApp: "WhatsApp",
  instagram: "Perfil no Instagram",
  Instagram: "Perfil no Instagram",
  nicho: "Nicho de Atuação",
  Nicho: "Nicho de Atuação",
  nome_marca_area: "Nome da Marca / Área de Atuação",
  Nome_Marca_Area: "Nome da Marca / Área de Atuação",
  porte_empresa: "Porte da Empresa / Atuação",
  Porte_Empresa: "Porte da Empresa / Atuação",
  status_empresa: "Status Atual da Empresa",
  Status_Empresa: "Status Atual da Empresa",
  tempo_mercado: "Tempo de Mercado",
  Tempo_Mercado: "Tempo de Mercado",

  // Perguntas Novas de Gerenciamento de Instagram
  tipo_venda: "Tipo de Produto / Venda",
  Tipo_Venda: "Tipo de Produto / Venda",
  quantidade_posts: "Quantidade de Posts / Frequência",
  Quantidade_Posts: "Quantidade de Posts / Frequência",
  entrega_ideal: "Modelo de Entrega Ideal",
  Entrega_Ideal: "Modelo de Entrega Ideal",
  investimento: "Faixa de Investimento Disponível",
  Investimento: "Faixa de Investimento Disponível",
  investimento_outro: "Investimento (Detalhe / Outro Valor)",
  Investimento_Outro: "Investimento (Detalhe / Outro Valor)",
  ciente_conteudo: "Ciente da Necessidade de Criação de Conteúdo?",
  Ciente_Conteudo: "Ciente da Necessidade de Criação de Conteúdo?",
  ciente_vaga: "Ciente sobre Lista de Espera / Vagas?",
  Ciente_Vaga: "Ciente sobre Lista de Espera / Vagas?",

  // Perguntas de Identidade Visual
  motivo_busca: "Motivo da Busca pelo Atelier",
  Motivo_Busca: "Motivo da Busca pelo Atelier",
  itens_adicionais: "Itens Adicionais de Interesse",
  Itens_Adicionais: "Itens Adicionais de Interesse",
  itens_adicionais_outro: "Itens Adicionais (Outros)",
  Itens_Adicionais_Outro: "Itens Adicionais (Outros)",
  urgencia: "Urgência do Projeto",
  Urgencia: "Urgência do Projeto",
  como_conheceu: "Como Conheceu o Atelier",
  Como_Conheceu: "Como Conheceu o Atelier",
  como_conheceu_outro: "Como Conheceu (Detalhe)",
  Como_Conheceu_Outro: "Como Conheceu (Detalhe)",
  preferencia_proposta: "Preferência de Envio da Proposta",
  Preferencia_Proposta: "Preferência de Envio da Proposta",
  projeto_referencia: "Projeto de Referência que Gostou",
  Projeto_Referencia: "Projeto de Referência que Gostou"
};

/**
 * Seções estruturadas para apresentação editorial no QG da Liziane
 */
export const BRIEFING_CATEGORIES = [
  {
    id: "contato",
    title: "01. Dados Centrais & Contato",
    keys: ["Nome_Cliente", "Nome_Marca", "Nome_Logotipo", "Tagline", "Slogan", "WhatsApp", "Email", "Status_Marca"]
  },
  {
    id: "origem",
    title: "02. Fundação, Origem & Propósito",
    keys: [
      "Motivo_Nascimento", "Motivo_Escolha_Negocio", "Historia_Importante", 
      "Tem_Significado_Nome", "Significado_Nome", "Conceito_Inseparavel", 
      "Frase_Resumo", "Pitch_10s", "Unica_Coisa_Resolver", "Motivo_Abertura", "Proposito", "Missao"
    ]
  },
  {
    id: "oferta",
    title: "03. Oferta & Negócio",
    keys: [
      "O_Que_Vende", "Produtos_Servicos", "Tipo_Produto", "Tipo_Produto_Outro", 
      "Motivo_Compra", "Diferenca_Outros", "Algo_Diferente", "Diferenca_Percebida", "Diferencial", "Tempo_Mercado"
    ]
  },
  {
    id: "publico",
    title: "04. Público & Cliente Ideal",
    keys: [
      "Perfil_Cliente", "Problema_Cliente", "Influencia_Compra", "Influencia_Compra_Outro", 
      "Sentimento_Desejado", "Sentimento_Desejado_Outro", "Cliente_Indesejado", "Resumo_Publico", 
      "Genero_Publico", "Genero_Publico_Outro", "Classe_Social", "Classe_Social_Outro", "Idade_Publico", "Idade_Publico_Outro", 
      "Sentimento_Consumidor", "Sentimento_Empresa"
    ]
  },
  {
    id: "mercado",
    title: "05. Mercado & Concorrência",
    keys: [
      "Concorrentes", "Links_Concorrentes", "Concorrentes_Bom", "Fazer_Diferente", 
      "Evitar_Mercado", "O_Que_Nao_Fazer"
    ]
  },
  {
    id: "personalidade",
    title: "06. Personalidade & Atributos",
    keys: [
      "Emoji_Empresa", "Musica_Empresa", "Atributos_Gerais", "Atributos_Gerais_Outro", 
      "Atributos_Top3", "Top_3_Adjetivos", "Adjetivos_Positivos", "Adjetivos_Positivos_Outro", 
      "Atributos_Nao_Transmitir", "Atributos_Nao_Transmitir_Outro", "Adjetivos_Negativos", "Adjetivos_Negativos_Outro", 
      "Porque_Atributos", "Sentimento_Marca"
    ]
  },
  {
    id: "eixos",
    title: "07. Eixos Estratégicos de Posicionamento (Escala 1 a 5)",
    isEixos: true,
    keys: [
      "Eixo_Tradicional_Contemporanea", "Eixo_Seria_Descontraida", "Eixo_Acessivel_Exclusiva", 
      "Eixo_Discreta_Ousada", "Eixo_Racional_Emocional", "Eixo_Minimalista_Expressiva"
    ]
  },
  {
    id: "percepcao",
    title: "08. Percepção & Posicionamento",
    keys: [
      "Percepcao_PrimeiraVez", "Percepcao_PosCompra", "Percepcao_Indesejada", 
      "Falta_Marca", "Validacao_Espelho", "Ajustes_Espelho"
    ]
  },
  {
    id: "universo_visual",
    title: "09. Universo Visual, Referências & Estilo",
    keys: [
      "Marcas_Admiradas", "Referencias_Inspiracoes", "Gosto_Referencias", "Gosto_Referencias_Outro", 
      "Marcas_Nao_Admiradas", "Nao_Gosto_Referencias", "Ambiente_Proximo", "Ambiente_Proximo_Outro", 
      "Atmosfera_Combinada", "Universo_Evitar", "Cor_Desejada_Opcao", "Cor_Desejada_Qual", "Cor_Desejada", 
      "Cor_Indesejada", "Cor_Nao_Desejada", "Simbolo_Desejado", "Simbolo_Especifico", "Simbolo_Indesejado", 
      "Identidade_Preservar", "Identidade_Abandonar", "Sobre_Logo_Atual"
    ]
  },
  {
    id: "futuro",
    title: "10. Aplicações, Futuro & Escolha",
    keys: [
      "Aplicacoes", "Onde_Verao_Identidade", "Aplicacoes_Outro", "Aplicacao_Principal", "Aplicacao_Especial", 
      "Empresa_Hoje", "Empresa_5_Anos", "Visao_5_Anos", "Representacao_Futuro", "Expansao", "Como_Expandir", 
      "Motivo_Escolha", "Motivo_Escolha_Liz", "Consideracoes_Finais", "Ideias_Livres_Extras"
    ]
  }
];

const IGNORED_SYSTEM_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'lido', 'notificado', 'dados_completos',
  'dados', 'table_name', 'tipo', '__savedat', '_draft_id', '__currentstep',
  'briefing_type', 'is_completed', 'status', 'profiles', 'raw', 'source_table'
]);

/**
 * Normaliza qualquer objeto de respostas de briefing deduplicando chaves lowercase e PascalCase
 */
export function normalizeBriefingAnswers(rawAnswers: Record<string, any>): Array<{ key: string; label: string; value: any }> {
  if (!rawAnswers || typeof rawAnswers !== 'object') return [];

  // Mapear primeiro para encontrar o melhor valor case-insensitive
  const normalizedMap = new Map<string, { originalKey: string; value: any }>();

  for (const [key, val] of Object.entries(rawAnswers)) {
    if (val === null || val === undefined || val === '') continue;
    const lowerKey = key.toLowerCase();
    if (IGNORED_SYSTEM_KEYS.has(lowerKey)) continue;

    // Se ainda não temos ou se a chave atual é PascalCase (mais descritiva), atualiza
    if (!normalizedMap.has(lowerKey)) {
      normalizedMap.set(lowerKey, { originalKey: key, value: val });
    } else {
      const existing = normalizedMap.get(lowerKey)!;
      // Se a nova chave tem valor preenchido e a existente estava vazia
      if ((existing.value === '' || existing.value === null) && val !== '') {
        normalizedMap.set(lowerKey, { originalKey: key, value: val });
      } else if (key !== key.toLowerCase() && existing.originalKey === existing.originalKey.toLowerCase()) {
        // Prefere chave formatada em PascalCase
        normalizedMap.set(lowerKey, { originalKey: key, value: existing.value || val });
      }
    }
  }

  const results: Array<{ key: string; label: string; value: any }> = [];

  for (const [lowerKey, item] of normalizedMap.entries()) {
    const label = BRIEFING_LABELS[item.originalKey] || BRIEFING_LABELS[lowerKey] || item.originalKey.replace(/_/g, ' ');
    let displayVal = item.value;
    if (Array.isArray(displayVal)) {
      displayVal = displayVal.filter(Boolean).join(', ');
    }
    if (typeof displayVal === 'string' && displayVal.trim() === '') continue;
    results.push({
      key: item.originalKey,
      label,
      value: displayVal
    });
  }

  return results;
}
