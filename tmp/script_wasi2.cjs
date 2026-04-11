const idCompany = '22125617';
const token = 'WIMW_fJc6_kxXq_RCg3';
const wasiId = '9543478';

async function testWasi() {
  const url1 = `https://api.wasi.co/v1/property/get/${wasiId}?id_company=${idCompany}&wasi_token=${token}`;
  try {
    const res1 = await fetch(url1, { method: 'GET'});
    const data1 = await res1.json();
    console.log('GET Result Array keys:', Object.keys(data1));
    console.log('GET Result Status:', data1.status);
    console.log('GET Result Message:', data1.message);
    
    // Sometimes Wasi returns the property without 'status' field, just the object directly.
    if (!data1.status) {
       console.log("Got Property ID : ", data1.id_property);
    }

  } catch (e) {
    console.error('Error GET:', e.message);
  }

  const url2 = `https://api.wasi.co/v1/property/get/${wasiId}`;
  try {
       const res2 = await fetch(url2, {
         method: 'POST',
           headers: {
            'Content-Type': 'application/json'
          },
         body: JSON.stringify({id_company: idCompany, wasi_token: token})
       });
       const data2 = await res2.json();
       console.log('POST JSON Result Status:', data2.status);
       console.log('POST JSON Result msg:', data2.message);
       if (!data2.status) {
         console.log("Got Property ID : ", data2.id_property);
       }
  } catch (e) {
    console.error('Error POST:', e.message);
  }
}

testWasi();
