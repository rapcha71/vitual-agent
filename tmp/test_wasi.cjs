const idCompany = '22125617';
const token = 'WIMW_fJc6_kxXq_RCg3';
const wasiId = '9543478';

async function testWasi() {
  const url = `https://api.wasi.co/v1/property/get/${wasiId}?id_company=${idCompany}&wasi_token=${token}`;
  console.log('Consultando a:', url.replace(token, 'XXX_TOKEN_XXX'));
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error(`Error HTTP: ${response.status}`);
      return;
    }

    const data = await response.json();
    if (data.status === 'error') {
      console.error('API Error:', data.message);
      return;
    }

    // Mostrar los campos que importan en la aplicación
    console.log('==== EXITO. DATOS RECIBIDOS ====');
    console.log('ID Propiedad:', data.id_property);
    console.log('Título:', data.title);
    console.log('Precio Alquiler:', data.rent_price_label);
    console.log('Precio Venta:', data.sale_price_label);
    console.log('Área C:', data.built_area);
    console.log('Área T:', data.area);
    console.log('Habitaciones:', data.bedrooms);
    console.log('Baños:', data.bathrooms);
    console.log('Año Const.:', data.year_built);
    console.log('Tipo:', data.property_type_label);
    console.log('Moneda:', data.iso_currency);
    
  } catch (err) {
    console.error('Fallo en la conexión:', err.message);
  }
}

testWasi();
