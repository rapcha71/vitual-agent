import re

filepath = r'd:\OneDrive\Desktop\EScritorio\vitual-agent\client\src\pages\admin-web-page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section between dataDiv.innerHTML = ` and the closing backtick
# The pattern to find
pattern = r'(dataDiv\.innerHTML = `\n)(.*?)(`;)'

replacement_body = """                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                        <div><strong>Precio Venta:</strong><br/>${data.sale_price_label || 'N/A'}</div>
                        <div><strong>Precio Alq:</strong><br/>${data.rent_price_label || 'N/A'}</div>
                        <div><strong>\\u00c1rea Total:</strong><br/>${data.area ? data.area + ' m\\u00b2' : 'N/A'}</div>
                        <div><strong>\\u00c1rea Construida:</strong><br/>${data.built_area ? data.built_area + ' m\\u00b2' : 'N/A'}</div>
                        <div><strong>A\\u00f1o Const:</strong><br/>${data.year_built || 'N/A'}</div>
                        <div><strong>Mant. Mensual:</strong><br/>${data.maintenance_fee || 'N/A'}</div>
                        ${data.bedrooms ? `<div><strong>🛏 Dormitorios:</strong><br/>${data.bedrooms}</div>` : ''}
                        ${data.bathrooms ? `<div><strong>🚿 Ba\\u00f1os:</strong><br/>${data.bathrooms}</div>` : ''}
                        ${data.garages ? `<div><strong>🚗 Garages:</strong><br/>${data.garages}</div>` : ''}
                      </div>
                      <div style="margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 5px; font-size: 11px;">
                        <strong>Tipo:</strong> ${data.property_type_label || 'N/A'}
                        ${data.property_condition_label ? ` &bull; <strong>Estado:</strong> ${data.property_condition_label}` : ''}
                      </div>
                      ${data.location_label ? `<div style="margin-top: 4px; font-size: 10px; color: #666;">📍 ${data.location_label}</div>` : ''}
                    """

# Find the innerHTML block more precisely
idx_start = content.find('dataDiv.innerHTML = `')
if idx_start == -1:
    print("ERROR: Could not find dataDiv.innerHTML")
    exit(1)

idx_end = content.find('`;', idx_start)
if idx_end == -1:
    print("ERROR: Could not find closing backtick")
    exit(1)

print(f"Found innerHTML block at {idx_start}:{idx_end}")
old_block = content[idx_start:idx_end+2]
print("Old block preview:", old_block[:100])

new_block = 'dataDiv.innerHTML = `\n' + replacement_body + '`;'
new_content = content[:idx_start] + new_block + content[idx_end+2:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: File updated!")
