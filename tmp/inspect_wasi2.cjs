const idCompany = '22125617';
const token = '4964_0daF_9is1_Ul8Y';
const wasiId = '9543478';

async function inspectWasiResponse() {
  const url = `https://api.wasi.co/v1/property/get/${wasiId}`;
  const formData = new URLSearchParams();
  formData.append('id_company', idCompany);
  formData.append('wasi_token', token);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });
  const data = await res.json();
  
  // Print ALL scalar fields sorted
  const scalars = Object.entries(data)
    .filter(([k, v]) => typeof v !== 'object' || v === null)
    .sort(([a], [b]) => a.localeCompare(b));
  
  for (const [key, value] of scalars) {
    console.log(`${key}: ${JSON.stringify(value)}`);
  }
}

inspectWasiResponse();
