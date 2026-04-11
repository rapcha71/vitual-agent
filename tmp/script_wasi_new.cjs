const idCompany = '22125617';
const token = '4964_0daF_9is1_Ul8Y';
const wasiId = '9543478';

async function testWasi() {
  const url1 = `https://api.wasi.co/v1/property/get/${wasiId}?id_company=${idCompany}&wasi_token=${token}`;
  try {
    const res1 = await fetch(url1, { method: 'GET'});
    const data1 = await res1.json();
    console.log('GET Result Status:', data1.status);
    console.log('GET Result Message:', data1.message);
    
    if (data1.status === 'success' || !data1.status) {
       console.log("Got Property Title : ", data1.title);
    }
  } catch (e) {
    console.error('Error GET:', e.message);
  }
}

testWasi();
