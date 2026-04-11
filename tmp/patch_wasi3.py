filepath = r'd:\OneDrive\Desktop\EScritorio\vitual-agent\client\src\pages\admin-web-page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 183-193 are indices 182-192
new_block = [
    '                    dataDiv.innerHTML = `\n',
    '                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">\n',
    "                        <div><strong>Precio Venta:</strong><br/>${data.sale_price_label || 'N/A'}</div>\n",
    "                        <div><strong>Precio Alq:</strong><br/>${data.rent_price_label || 'N/A'}</div>\n",
    "                        <div><strong>Area Total:</strong><br/>${data.area ? data.area + ' m2' : 'N/A'}</div>\n",
    "                        <div><strong>Area Const:</strong><br/>${data.built_area ? data.built_area + ' m2' : 'N/A'}</div>\n",
    "                        <div><strong>Ano Const:</strong><br/>${data.building_date || 'N/A'}</div>\n",
    "                        <div><strong>Condicion:</strong><br/>${data.property_condition_label || 'N/A'}</div>\n",
    "                        ${data.bedrooms ? '<div><strong>Dormitorios:</strong><br/>' + data.bedrooms + '</div>' : ''}\n",
    "                        ${data.bathrooms ? '<div><strong>Banos:</strong><br/>' + data.bathrooms + '</div>' : ''}\n",
    "                        ${data.garages ? '<div><strong>Garages:</strong><br/>' + data.garages + '</div>' : ''}\n",
    '                      </div>\n',
    '                      <div style="margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 5px; font-size: 11px;">\n',
    "                        ${data.city_label ? data.city_label + (data.region_label ? ', ' + data.region_label : '') : ''}\n",
    '                      </div>\n',
    '                    `;\n',
]

lines[182:193] = new_block

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('SUCCESS!')
