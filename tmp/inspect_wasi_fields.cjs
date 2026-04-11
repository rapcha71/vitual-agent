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
  
  // Print ALL keys and their values
  console.log('\n=== ALL WASI FIELDS ===');
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'object' || value === null) {
      console.log(`${key}: ${JSON.stringify(value)}`);
    }
  }
  
  // Specifically check suspected fields
  console.log('\n=== KEY FIELDS ===');
  console.log('year_built:', data.year_built);
  console.log('built_year:', data.built_year);
  console.log('property_type_label:', data.property_type_label);
  console.log('tipo:', data.tipo);
  console.log('type:', data.type);
  console.log('id_type:', data.id_type);
  console.log('bathrooms:', data.bathrooms);
  console.log('bedrooms:', data.bedrooms);
  console.log('rooms:', data.rooms);
}

inspectWasiResponse();
