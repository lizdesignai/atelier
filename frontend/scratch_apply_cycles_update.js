require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL);

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getBillingDay(billingDate) {
  if (!billingDate) return 1;
  const d = new Date(billingDate);
  return d.getUTCDate() || 1;
}

function getCurrentCyclePeriod(billingDayOfMonth, referenceDate = new Date()) {
  const now = referenceDate;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

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

function computeCycleCount(firstPaymentDate, currentPeriodStart) {
  const start = new Date(firstPaymentDate);
  const cur = new Date(currentPeriodStart);

  let months = (cur.getUTCFullYear() - start.getUTCFullYear()) * 12 + (cur.getUTCMonth() - start.getUTCMonth());
  if (months < 0) months = 0;
  return months + 1;
}

async function run() {
  try {
    const projects = await sql`
      SELECT p.id, pr.nome as client_name, p.billing_date, p.created_at, p.contract_start
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE p.service_type = 'Gestão de Instagram'
    `;

    console.log(`Atualizando contagem de ciclos para ${projects.length} projetos de Instagram...\n`);
    const today = new Date('2026-10-14T17:00:00Z');

    for (const p of projects) {
      const bDay = getBillingDay(p.billing_date);
      const currentPeriod = getCurrentCyclePeriod(bDay, today);
      const firstDate = p.contract_start ? new Date(p.contract_start) : (p.billing_date ? new Date(p.billing_date) : new Date(p.created_at));
      const cycleNum = computeCycleCount(firstDate, currentPeriod.periodStartDate);

      // Atualiza ou insere o ciclo atual do projeto
      const [updatedCycle] = await sql`
        UPDATE ig_cycles
        SET 
          cycle_number = ${cycleNum},
          period_start = ${currentPeriod.periodStart},
          period_end = ${currentPeriod.periodEnd},
          status = 'open',
          updated_at = NOW()
        WHERE project_id = ${p.id}
        RETURNING *
      `;

      // Garante vínculo das tarefas com status de review ou com deadline no período
      await sql`
        UPDATE tasks
        SET cycle_id = ${updatedCycle.id}, ig_is_piece = true
        WHERE project_id = ${p.id}
          AND (
            status = 'review'
            OR ig_publish_status = 'adjust_requested'
            OR (deadline >= ${currentPeriod.periodStart}::date AND deadline <= (${currentPeriod.periodEnd}::date + interval '1 day'))
          )
      `;

      console.log(`✅ ${p.client_name}: Ciclo #${cycleNum} (${currentPeriod.periodStart} a ${currentPeriod.periodEnd})`);
    }

    console.log('\nTodos os ciclos foram atualizados com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  }
}

run();
