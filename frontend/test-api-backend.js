async function run() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
    const response = await fetch(`${backendUrl}/api/v1/clients/overview`);
    const { data } = await response.json();
    console.log("availableClients sample:", data.availableClients?.slice(0, 2));
  } catch(e) { console.error(e) }
}
run();
