// src/lib/AtelierCFOEngine.ts

export class AtelierCFOEngine {
  
  /**
   * ============================================================================
   * 1. MATRIZ DE UNIT ECONOMICS (Vampiros vs Vacas Leiteiras)
   * Avalia a rentabilidade real (Margem) versus a retenção/satisfação (T-NPS).
   * O motor agora é mais rigoroso nas margens para agências de serviços.
   * ============================================================================
   */
  static getClientQuadrant(margin: number, tNps: number) {
    // 🟢 Cash Cows (Vacas Leiteiras): Alta Margem (>= 50%) + Alta Satisfação (>= 80)
    if (margin >= 50 && tNps >= 80) {
      return { 
        id: 'cow', 
        label: 'Cash Cow (Vaca Leiteira)', 
        color: 'green', 
        action: 'Operação otimizada. Focar em retenção a longo prazo e pedir referências.' 
      };
    }
    // 🔵 High Potential (Ouro Oculto): Baixa Margem (< 50%) + Alta Satisfação (>= 80)
    // O cliente ama o serviço, mas o Atelier está a "pagar para trabalhar".
    if (margin < 50 && tNps >= 80) {
      return { 
        id: 'potential', 
        label: 'High Potential (Ouro Oculto)', 
        color: 'blue', 
        action: 'Cliente altamente satisfeito. Executar Upsell ou reajustar preço (+20%) na renovação.' 
      };
    }
    // 🟠 Churn Risk (Risco de Fuga): Alta Margem (>= 50%) + Baixa Satisfação (< 80)
    // A agência lucra bem, mas o cliente está insatisfeito e prestes a cancelar.
    if (margin >= 50 && tNps < 80) {
      return { 
        id: 'risk', 
        label: 'Churn Risk (Risco de Fuga)', 
        color: 'orange', 
        action: 'ALERTA: Margem alta em risco. Acionar intervenção imediata de Customer Success.' 
      };
    }
    // 🔴 Time Vampires (Vampiros de Tempo): Baixa Margem (< 50%) + Baixa Satisfação (< 80)
    // Sugam o tempo da equipa, dão prejuízo e ainda reclamam.
    return { 
      id: 'vampire', 
      label: 'Time Vampire (Vampiro de Tempo)', 
      color: 'red', 
      action: 'CUSTO TÓXICO: Subir preço drasticamente (+50%) ou demitir o cliente para libertar a equipa.' 
    };
  }

  /**
   * ============================================================================
   * 2. NET BURN RATE & RUNWAY (Tempo de Vida)
   * Um CFO real não calcula a queima bruta, mas sim a queima líquida. 
   * Se o MRR cobre as despesas, o Runway é infinito. Caso contrário, conta os meses.
   * ============================================================================
   */
  static calculateRunway(cashInBank: number, mrr: number, totalOutflows: number): { months: number, isProfitable: boolean, text: string } {
    const netBurnRate = totalOutflows - mrr;

    // Se o MRR for maior ou igual aos custos fixos, a operação não sangra caixa.
    if (netBurnRate <= 0) {
      return { months: 999, isProfitable: true, text: "∞ (Operação Lucrativa)" };
    }

    // Se a agência está a dar prejuízo mensal (Sangria Líquida)
    const runwayMonths = cashInBank / netBurnRate;
    return { 
      months: runwayMonths, 
      isProfitable: false, 
      text: runwayMonths.toFixed(1) 
    };
  }

  /**
   * ============================================================================
   * 3. RISK-ADJUSTED FORECASTING (Predição de Fluxo de Caixa Líquido)
   * Projeta os próximos 30/60/90 dias considerando Entradas, Saídas e CHURN.
   * ============================================================================
   */
  static calculateForecasting(mrr: number, pendingBillings: any[], totalOutflows: number, churnRiskAmount: number) {
    const today = new Date();
    const days30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const days60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const days90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Penalização de Risco: Assumimos que 50% do MRR em risco vai cancelar nos próximos 90 dias
    const adjustedMRR = Math.max(0, mrr - (churnRiskAmount * 0.5));

    // Projeção base de Receita Recorrente Ajustada
    let in30 = adjustedMRR;
    let in60 = adjustedMRR * 2;
    let in90 = adjustedMRR * 3;

    // Somar Faturas Pontuais (Projetos IDV, Entregas)
    pendingBillings.forEach(bill => {
      // Ignoramos faturas do tipo MRR aqui para não duplicar, pois já estão no adjustedMRR
      if (bill.type && bill.type.includes('MRR')) return;

      let billDate = new Date(bill.date);
      if (isNaN(billDate.getTime())) billDate = days30; // Fallback: Assume que "Na Entrega" entra em 30 dias

      if (billDate <= days30) in30 += bill.amount;
      if (billDate <= days60) in60 += bill.amount;
      if (billDate <= days90) in90 += bill.amount;
    });

    // Subtrair as Despesas Operacionais Projetadas (Net Cash Flow)
    const net30 = in30 - totalOutflows;
    const net60 = in60 - (totalOutflows * 2);
    const net90 = in90 - (totalOutflows * 3);

    return {
      days30: net30,
      days60: net60,
      days90: net90
    };
  }

  /**
   * ============================================================================
   * 4. CÁLCULO DE EBITDA E MARGEM OPERACIONAL
   * ============================================================================
   */
  static calculateEBITDA(totalRevenue: number, totalOutflows: number) {
    const ebitda = totalRevenue - totalOutflows;
    const ebitdaMargin = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0;
    
    return {
      ebitdaReal: ebitda,
      ebitdaMargin: Math.round(ebitdaMargin)
    };
  }

  /**
   * ============================================================================
   * 5. ALOCAÇÃO DE CAPITAL DEFENSIVA (Investment Engine)
   * Se o Runway for perigoso (< 3 meses), o CFO corta os dividendos e o Growth
   * e redireciona 100% do lucro para o Caixa (Sobrevivência).
   * ============================================================================
   */
  static calculateCapitalAllocation(availableCash: number, runwayMonths: number) {
    // Se não há lucro a distribuir, tudo fica a zeros.
    if (availableCash <= 0) {
      return { reserva: 0, growth: 0, dividendos: 0, mode: 'Deficit' };
    }

    // 🔴 MODO SOBREVIVÊNCIA: Menos de 3 meses de vida
    if (runwayMonths < 3) {
      return {
        reserva: availableCash * 1.00,  // 100% para Salvar a Agência
        growth: 0,                      // Congela anúncios
        dividendos: 0,                  // Congela lucros dos sócios
        mode: 'Sobrevivência (Runway < 3m)'
      };
    }

    // 🟡 MODO CONSERVADOR: Entre 3 e 6 meses de vida
    if (runwayMonths < 6) {
      return {
        reserva: availableCash * 0.60,  // 60% para reforçar o Caixa
        growth: availableCash * 0.30,   // 30% para tentar crescer
        dividendos: availableCash * 0.10, // 10% distribuição mínima
        mode: 'Conservador (Construção de Caixa)'
      };
    }

    // 🟢 MODO AGRESSIVO / WALL STREET: Mais de 6 meses de vida (ou infinito)
    return {
      reserva: availableCash * 0.30,    // 30% Reserva Estratégica
      growth: availableCash * 0.40,     // 40% Máquina de Aquisição Ativa
      dividendos: availableCash * 0.30, // 30% Distribuição de Lucros Base
      mode: 'Agressivo (Expansão e Distribuição)'
    };
  }
}