// src/lib/AtelierCFOEngine.ts

export class AtelierCFOEngine {
  
  /**
   * 1. MATRIZ DE VAMPIROS E VACAS LEITEIRAS (Unit Economics Avançado)
   * Avalia a rentabilidade (Margem) versus o desgaste operacional e satisfação (T-NPS).
   */
  static getClientQuadrant(margin: number, tNps: number) {
    // 🟢 Cash Cows (Vacas Leiteiras): Alto Lucro + Baixo Esforço (Alta Margem + Alto NPS)
    if (margin >= 50 && tNps >= 80) {
      return { id: 'cow', label: 'Cash Cows (Vacas Leiteiras)', color: 'green', action: 'Manter e replicar o perfil' };
    }
    // 🔵 High Potential (Ouro Oculto): Alto T-NPS + Baixa Margem
    if (margin < 50 && tNps >= 80) {
      return { id: 'potential', label: 'High Potential (Ouro Oculto)', color: 'blue', action: 'Fazer Upsell ou reajustar o preço' };
    }
    // 🟠 Churn Risk (Risco de Fuga): Baixo T-NPS + Alta Margem
    if (margin >= 50 && tNps < 80) {
      return { id: 'risk', label: 'Churn Risk (Risco de Fuga)', color: 'orange', action: 'Intervenção do Gestor (CS)' };
    }
    // 🔴 Time Vampires (Vampiros de Tempo): Baixo Lucro + Alto Esforço
    return { id: 'vampire', label: 'Time Vampires (Vampiros de Tempo)', color: 'red', action: 'Demitir cliente ou subir preço drasticamente' };
  }

  /**
   * 2. PREDIÇÃO DE FLUXO DE CAIXA (Forecasting & Runway)
   * Projetar a receita futura e o tempo de sobrevivência.
   */
  static calculateRunway(cashInBank: number, monthlyBurnRate: number): string {
    if (monthlyBurnRate <= 0) return "999";
    return (cashInBank / monthlyBurnRate).toFixed(1);
  }

  static calculateForecasting(mrr: number, pendingBillings: { amount: number, date: string }[]) {
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    let proj30 = mrr;
    let proj60 = mrr * 2;
    let proj90 = mrr * 3;

    pendingBillings.forEach(bill => {
        let billDate = new Date(bill.date);
        
        // Fallback inteligente: se a data for 'Na Entrega', assumimos impacto no curto prazo (D+30)
        if (isNaN(billDate.getTime())) {
            billDate = thirtyDays; 
        }

        if (billDate <= thirtyDays) proj30 += bill.amount;
        if (billDate <= sixtyDays) proj60 += bill.amount;
        if (billDate <= ninetyDays) proj90 += bill.amount;
    });

    return {
        days30: proj30,
        days60: proj60,
        days90: proj90
    };
  }

  /**
   * 3. O PAINEL DE SANGRIA E EBITDA
   * Subtrai os custos fixos mensais do MRR para dar o Lucro Líquido Real.
   */
  static calculateEBITDA(mrr: number, totalOutflows: number) {
    const ebitda = mrr - totalOutflows;
    const ebitdaMargin = mrr > 0 ? ((ebitda / mrr) * 100).toFixed(1) : "0.0";
    
    return {
      ebitdaReal: ebitda,
      ebitdaMargin: parseFloat(ebitdaMargin)
    };
  }

  /**
   * 4. ALGORITMO DE ALOCAÇÃO DE CAPITAL (Investment Engine)
   * Modelo de fundo de investimento (30-40-30).
   */
  static calculateCapitalAllocation(availableCash: number) {
    return {
      reserva: availableCash * 0.30,    // 🛡️ 30% Reserva de Emergência: Blindagem do negócio
      growth: availableCash * 0.40,     // 🚀 40% Growth & Aquisição: Tráfego pago, marketing
      dividendos: availableCash * 0.30  // 💰 30% Distribuição: O seu prémio como dono do negócio
    };
  }
}