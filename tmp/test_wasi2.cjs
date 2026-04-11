const idCompany = '22125617';
const token = 'WIMW_fJc6_kxXq_RCg3';
const wasiId = '9543478';

async function testWasi() {
  const url = `https://api.wasi.co/v1/property/get/${wasiId}`;
  
  // Method 1: Query Params (already tried)
  // Method 2: POST JSON
  console.log('Intentando mediante POST JSON...');
  try {
    const res2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        id_company: idCompany,
        wasi_token: token
      })
    });
    const d2 = await res2.json();
    console.log('POST JSON result:', typeof d2 === 'object' ? JSON.stringify(d2).substring(0, 50) : d2);
  } catch(e) {}

  // Method 3: POST FormData / application/x-www-form-urlencoded
  console.log('Intentando mediante POST URL-encoded...');
  try {
    const params = new URLSearchParams();
    params.append('id_company', idCompany);
    params.append('wasi_token', token);
    const res3 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: params
    });
    const d3 = await res3.json();
    console.log('POST URL-encoded result:', typeof d3 === 'object' && d3.status === 'success' ? 'SUCCESS! ID: ' + d3.id_property : JSON.stringify(d3).substring(0, 50));
    if (d3.status === 'success') {
      console.log('DATOS:', d3.title, d3.sale_price_label);
    }
  } catch(e) {}
}

testWasi();
