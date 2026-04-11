import sys

filepath = r'd:\OneDrive\Desktop\EScritorio\vitual-agent\client\src\pages\admin-web-page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace lines 183-193 (0-indexed: 182-192)
new_block = [
    '                    dataDiv.innerHTML = `\n',
    '                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">\n',
    "                        <div><strong>Precio Venta:</strong><br/>${data.sale_price_label || 'N/A'}</div>\n",
    "                        <div><strong>Precio Alq:</strong><br/>${data.rent_price_label || 'N/A'}</div>\n",
    "                        <div><strong>\u00c1rea Total:</strong><br/>${data.area ? data.area + ' m\u00b2' : 'N/A'}</div>\n",
    "                        <div><strong>\u00c1rea Construida:</strong><br/>${data.built_area ? data.built_area + ' m\u00b2' : 'N/A'}</div>\n",
    "                        <div><strong>A\u00f1o Const:</strong><br/>${data.building_date || 'N/A'}</div>\n",
    "                        <div><strong>Condici\u00f3n:</strong><br/>${data.property_condition_label || 'N/A'}</div>\n",
    "                        ${data.bedrooms ? `<div><strong>\ud83d\udecf Dormitorios:</strong><br/>${data.bedrooms}</div>` : ''}\n",
    "                        ${data.bathrooms ? `<div><strong>\ud83d\udebf Ba\u00f1os:</strong><br/>${data.bathrooms}</div>` : ''}\n",
    "                        ${data.garages ? `<div><strong>\ud83d\ude97 Garages:</strong><br/>${data.garages}</div>` : ''}\n",
    '                      </div>\n',
    '                      <div style="margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 5px; font-size: 11px;">\n',
    "                        ${data.city_label ? `<strong>\ud83d\udccd</strong> ${data.city_label}${data.region_label ? ', ' + data.region_label : ''}` : ''}\n",
    '                      </div>\n',
    '                    `;\n',
]

# Lines 183-193 are indices 182-192
lines[182:193] = new_block

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('SUCCESS: File updated with correct WASI field names!')
print(f'Replaced lines 183-193 with {len(new_block)} new lines')
