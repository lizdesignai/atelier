const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getBillingDay(billingDate) {
  if (!billingDate) return 1;
  const d = new Date(billingDate);
  return d.getUTCDate() || 1;
}

// Retorna o período do ciclo atual baseado no billing day e na data de hoje
function getCurrentCyclePeriod(billingDayOfMonth, referenceDate = new Date()) {
  const now = referenceDate;
  const year = now.getFullYear();
  const month = now.getMonth();

  const cappedDay = Math.min(billingDayOfMonth, daysInMonth(year, month));
  const thisMonthStart = new Date(Date.UTC(year, month, cappedDay));

  let periodStart;
  let periodEnd;

  if (now >= thisMonthStart) {
    periodStart = thisMonthStart;
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const nm = nextMonth % 12;
    const cappedEnd = Math.min(billingDayOfMonth, daysInMonth(nextYear, nm));
    periodEnd = new Date(Date.UTC(nextYear, nm, cappedEnd));
  } else {
    const prevMonth = month - 1;
    const prevYear = prevMonth < 0 ? year - 1 : year;
    const pm = prevMonth < 0 ? 11 : prevMonth;
    const cappedPrev = Math.min(billingDayOfMonth, daysInMonth(prevYear, pm));
    periodStart = new Date(Date.UTC(prevYear, pm, cappedPrev));
    periodEnd = thisMonthStart;
  }

  periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);

  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    periodStartDate: periodStart,
    periodEndDate: periodEnd
  };
}

// Calcula quantos ciclos mensais se passaram desde o primeiro pagamento até o período atual
function computeCycleCount(firstPaymentDate, currentPeriodStart) {
  const start = new Date(firstPaymentDate);
  const cur = new Date(currentPeriodStart);

  // Diferença em meses
  let months = (cur.getFullYear() - start.getFullYear()) * 12 + (cur.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  return months + 1; // O primeiro mês é o Ciclo 1
}

async function test() {
  try {
    const projects = await sql`
      SELECT p.id, pr.nome as client_name, p.billing_date, p.created_at, p.contract_start, p.type
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE p.service_type = 'Gestão de Instagram'
      ORDER BY pr.nome ASC
    `;

    console.log(`=== CÁLCULO DE CICLOS REAIS (Hoje: 14/10/2026) ===\n`);

    for (const p of projects) {
      const bDay = getBillingDay(p.billing_date);
      const currentPeriod = getCurrentCyclePeriod(bDay, new Date('2026-10-14T17:00:00Z'));
      
      // Data do primeiro pagamento: contract_start > primeiro mês de billing_date > created_at
      const firstDate = p.contract_start ? new Date(p.contract_start) : (p.billing_date ? new Date(p.billing_date) : new Date(p.created_at));
      
      const cycleNum = computeCycleCount(firstDate, currentPeriod.periodStartDate);

      console.log(`Cliente: ${p.client_name}`);
      console.log(`  1º Pagamento / Início: ${firstDate.toISOString().split('T')[0]}`);
      console.log(`  Billing Day: Dia ${bDay}`);
      console.log(`  Ciclo Atual: Ciclo #${cycleNum} (${currentPeriod.periodStart} até ${currentPeriod.periodEnd})\n`);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

test();
