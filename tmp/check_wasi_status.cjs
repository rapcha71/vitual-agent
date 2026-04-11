// Necesitas tu cookie de sesión de super admin para este endpoint
// Ejecuta esto en la consola del browser mientras estás logueado como superadmin en virtualagentcr.com

// Pega esto en la consola del navegador (F12 -> Console):
/*
fetch('/api/admin/wasi-status', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)));
*/

// O si quieres correrlo desde aquí con tu cookie (reemplaza COOKIE_VALUE):
const cookie = 'YOUR_SESSION_COOKIE_HERE';

async function checkWasiStatus() {
  const res = await fetch('https://virtualagentcr.com/api/admin/wasi-status', {
    headers: { 'Cookie': cookie }
  });
  const data = await res.json();
  console.log('WASI Status:', JSON.stringify(data, null, 2));
}

checkWasiStatus();
