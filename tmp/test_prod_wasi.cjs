// Test del endpoint de produccion directamente
async function testProd() {
  // Primero probamos si el endpoint existe usando un property ID de prueba
  const testUrl = 'https://virtualagentcr.com/api/admin/properties/test/link-wasi';
  
  try {
    const res = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wasiId: '9543478' }),
    });
    
    const status = res.status;
    const data = await res.json().catch(() => null);
    console.log('Prod response status:', status);
    console.log('Prod response body:', JSON.stringify(data));
  } catch(e) {
    console.log('Error:', e.message);
  }
}

testProd();
