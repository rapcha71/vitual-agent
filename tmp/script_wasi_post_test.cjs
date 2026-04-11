const idCompany = '22125617';
const token = '4964_0daF_9is1_Ul8Y';
const wasiId = '9543478';

async function testWasi() {
  const url = `https://api.wasi.co/v1/property/get/${wasiId}`;
  const formData = new URLSearchParams();
  formData.append('id_company', idCompany);
  formData.append('wasi_token', token);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();
    console.log('Result:', data.status, data.message);
    if (!data.status || data.status === 'success') {
      console.log('Success!', data.title);
    }
  } catch(e) {
    console.log("Error:", e);
  }
}
testWasi();
