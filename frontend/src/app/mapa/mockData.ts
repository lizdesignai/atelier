export const mockMapaData = {
  score: {
    total: 72,
    dimensions: {
      clareza: 82,
      autoridade: 71,
      percepcao: 76,
      conversao: 48,
    },
  },
  benchmark: {
    total: 64,
    dimensions: {
      clareza: 69,
      autoridade: 65,
      percepcao: 70,
      conversao: 59,
    },
  },
  diagnostic: {
    gargalo_principal: "CONVERSÃO",
    score_gargalo: 48,
    interpretacao: "Você apresenta sua marca melhor do que conduz o visitante até a próxima ação.",
    issues: [
      {
        id: "01",
        title: "Caminho de compra pouco evidente",
        description: "Seu visitante precisa tomar iniciativa para descobrir como contratar.",
      },
      {
        id: "02",
        title: "Oferta pouco explícita",
        description: "O conteúdo demonstra competência, mas nem sempre deixa claro qual é o próximo passo.",
      },
      {
        id: "03",
        title: "CTA inconsistente",
        description: "Existem chamadas para ação, mas elas não aparecem como parte de um sistema contínuo.",
      },
    ],
  },
  evidences: [
    {
      pergunta: "Se um cliente ideal encontrasse seu perfil e quisesse comprar...",
      resposta: "Precisaria mandar uma DM para descobrir.",
    },
    {
      pergunta: "Com que frequência uma publicação gera orçamento ou venda?",
      resposta: "Ocasionalmente.",
    },
    {
      pergunta: "Suas legendas...",
      resposta: "Boas, mas esqueço do CTA.",
    },
  ],
  plan: {
    prioridade_1: {
      title: "Tornar o caminho de compra evidente.",
      impacto: "alto",
      esforco: "médio",
      descricao: "Seu perfil já possui elementos de autoridade. O próximo ganho está em reduzir a distância entre interesse e ação.",
      tasks: [
        { id: "p1_1", text: "Revisar bio", completed: false },
        { id: "p1_2", text: "Definir oferta principal", completed: false },
        { id: "p1_3", text: "Criar CTA", completed: false },
        { id: "p1_4", text: "Revisar link", completed: false },
      ],
    },
    prioridade_2: {
      title: "Aumentar percepção de autoridade.",
      impacto: "médio",
      esforco: "baixo",
      descricao: "",
      tasks: [
        { id: "p2_1", text: "Organizar provas sociais", completed: false },
        { id: "p2_2", text: "Criar destaque de resultados", completed: false },
        { id: "p2_3", text: "Estruturar casos", completed: false },
      ],
    },
    prioridade_3: {
      title: "Aprimorar consistência visual.",
      impacto: "médio",
      esforco: "médio",
      descricao: "",
      tasks: [
        { id: "p3_1", text: "Padronizar templates", completed: false },
        { id: "p3_2", text: "Definir sistema visual", completed: false },
        { id: "p3_3", text: "Revisar aplicações", completed: false },
      ],
    },
  },
  recommendation: {
    type: "gestao", // "gestao" ou "identidade"
    title: "Gestão de Instagram",
    reason: "Porque seus principais gaps estão em Autoridade + Conversão. A próxima etapa é transformar sua presença atual em um sistema contínuo de conteúdo, prova e conversão.",
  },
};
