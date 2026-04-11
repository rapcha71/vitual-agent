const fs = require('fs');
const filepath = 'client/src/pages/admin-web-page.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const oldHtml = `                    dataDiv.innerHTML = \`
                      <div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 4px;\">
                        <div><strong>Precio Venta:</strong><br/>\${data.sale_price_label || 'N/A'}</div>
                        <div><strong>Precio Alq:</strong><br/>\${data.rent_price_label || 'N/A'}</div>
                        <div><strong>Área Total:</strong><br/>\${data.area || 'N/A'} \${data.area ? 'm²' : ''}</div>
                        <div><strong>Año Const:</strong><br/>\${data.year_built || 'N/A'}</div>
                      </div>
                      <div style=\"margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 6px;\">
                        <strong>Ubicación:</strong>  &bull; <strong>Estatus:</strong> \${data.property_type_label || 'N/A'}
                      </div>
                    \`;`;

const oldHtmlOriginal = `                    dataDiv.innerHTML = \`
                      <div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 4px;\">
                        <div><strong>Precio Venta:</strong><br/>\${data.sale_price_label || 'N/A'}</div>
                        <div><strong>Precio Alq:</strong><br/>\${data.rent_price_label || 'N/A'}</div>
                        <div><strong>Área Total:</strong><br/>\${data.area || 'N/A'} \${data.area ? 'm²' : ''}</div>
                        <div><strong>Año Const:</strong><br/>\${data.year_built || 'N/A'}</div>
                      </div>
                      <div style=\"margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 6px;\">
                        <strong>Tipo:</strong> \${data.property_type_label || 'N/A'}
                      </div>
                    \`;`;


const oldHtmlMixed = `                    dataDiv.innerHTML = \`
                      <div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 4px;\">
                        <div><strong>Precio Venta:</strong><br/>\${data.sale_price_label || 'N/A'}</div>
                        <div><strong>Precio Alq:</strong><br/>\${data.rent_price_label || 'N/A'}</div>
                        <div><strong>Área Total:</strong><br/>\${data.area || 'N/A'} \${data.area ? 'm²' : ''}</div>
                        <div><strong>Año Const:</strong><br/>\${data.year_built || 'N/A'}</div>
                      </div>
                      <div style=\"margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 6px;\">
                        <strong>Ubicación:</strong>  &bull; <strong>Estatus:</strong> \${data.property_type_label || 'N/A'}
                      </div>
                    \`;`;

const newHtml = `                    dataDiv.innerHTML = \`
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                        <div><strong>Precio Venta:</strong><br/>\${data.sale_price_label || 'N/A'}</div>
                        <div><strong>Precio Alq:</strong><br/>\${data.rent_price_label || 'N/A'}</div>
                        <div><strong>Área Total:</strong><br/>\${data.area ? data.area + ' m²' : 'N/A'}</div>
                        <div><strong>Área Const:</strong><br/>\${data.built_area ? data.built_area + ' m²' : 'N/A'}</div>
                        <div><strong>Año Const:</strong><br/>\${data.building_date || 'N/A'}</div>
                        <div><strong>Condición:</strong><br/>\${data.property_condition_label || 'N/A'}</div>
                        \${data.bedrooms ? \`<div><strong>Dormitorios:</strong><br/>\${data.bedrooms}</div>\` : ''}
                        \${data.bathrooms ? \`<div><strong>Baños:</strong><br/>\${data.bathrooms}</div>\` : ''}
                        \${data.garages ? \`<div><strong>Garages:</strong><br/>\${data.garages}</div>\` : ''}
                      </div>
                      <div style="margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 5px; font-size: 11px;">
                        \${data.city_label ? \`<strong>📍Ubicación:</strong> \${data.city_label}\${data.region_label ? ', ' + data.region_label : ''}\` : ''}
                      </div>
                    \`;`;

if (content.includes(oldHtmlOriginal)) {
  fs.writeFileSync(filepath, content.replace(oldHtmlOriginal, newHtml));
  console.log("Replaced Original");
} else if (content.includes(oldHtmlMixed)) {
  fs.writeFileSync(filepath, content.replace(oldHtmlMixed, newHtml));
  console.log("Replaced Mixed");
} else {
  // Try regex matching content between dataDiv.innerHTML and the closing \`;
  const pattern = /dataDiv\.innerHTML = \`[\s\S]*?                  \`;/;
  if (pattern.test(content)) {
    fs.writeFileSync(filepath, content.replace(pattern, newHtml));
    console.log("Replaced via regex");
  } else {
    console.log("Not replaced");
  }
}
