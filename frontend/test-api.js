async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/briefings/idv/list');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
