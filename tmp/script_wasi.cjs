const fs = require('fs');
require('dotenv').config();

const idCompany = process.env.WASI_ID_COMPANY;
const token = process.env.WASI_TOKEN;
const wasiId = '9543478';

async function testWasi() {
  console.log('Testing WASI with GET...');
  const url1 = `https://api.wasi.co/v1/property/get/${wasiId}?id_company=${idCompany}&wasi_token=${token}`;
  
  try {
    const res1 = await fetch(url1, { method: 'GET', headers: { 'Accept': 'application/json' }});
    const data1 = await res1.json();
    console.log('GET Result Array keys:', Object.keys(data1));
    console.log('GET Result Status:', data1.status);
    console.log('GET message:', data1?.message || data1);
    
    if(data1.status === 'error') {
       console.log('Trying with POST form-urlencoded...');
       const url2 = `https://api.wasi.co/v1/property/get/${wasiId}`;
       const formData = new URLSearchParams();
       formData.append('id_company', idCompany);
       formData.append('wasi_token', token);
       
       const res2 = await fetch(url2, {
         method: 'POST',
           headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
         body: formData
       });
       const data2 = await res2.json();
       console.log('POST Result keys:', Object.keys(data2));
       console.log('POST Result status:', data2.status);
       console.log('POST Result message:', data2.message);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

testWasi();
