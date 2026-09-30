import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://tmmptilchainrsptwsxc.supabase.co', 'dummy');

class NeonProxyBuilder {
  constructor(table) { this.table = table; }
  select(cols) { this.cols = cols; return this; }
  in(col, vals) { this.inCol = col; this.inVals = vals; return this; }
  async _execute() {
    return fetch('http://localhost:3000/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: this.table,
        operation: 'select',
        columns: this.cols,
        filters: [{type: 'in', column: this.inCol, value: this.inVals}],
        orders: [], limit: null, single: false, maybeSingle: false, head: false, count: null
      })
    }).then(async r => {
      console.log("Status:", r.status);
      console.log("Raw Response:", await r.text());
      return { data: null };
    });
  }
  then(res, rej) { return this._execute().then(res, rej); }
}

supabase.from = (table) => new NeonProxyBuilder(table);

async function run() {
  await supabase.from('profiles').select('id, nome, role, avatar_url').in('role', ['colaborador', 'gestor', 'admin']);
}
run();
