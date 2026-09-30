async function run() {
  const res = await fetch('http://localhost:3000/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': 'atelier_session=dummy' },
    body: JSON.stringify({
      table: 'profiles',
      operation: 'select',
      columns: '*',
      filters: [{type: 'in', column: 'role', value: ['colaborador', 'gestor', 'admin']}]
    })
  });
  const text = await res.text();
  console.log("Response:", text);
}
run();
