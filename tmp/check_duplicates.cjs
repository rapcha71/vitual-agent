const { Pool } = require('pg');

async function checkDuplicates() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const res = await pool.query(`
      SELECT 
        id, 
        property_id as "propertyId", 
        sign_phone_number as "signPhoneNumber", 
        location
      FROM properties
      WHERE sign_phone_number IS NOT NULL
    `);
    
    const properties = res.rows;
    console.log(`Found ${properties.length} properties with phone numbers.`);
    
    const normalizePhoneNumber = (phone) => {
      if (!phone) return null;
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length === 8) {
        return '+506' + digitsOnly;
      }
      if (digitsOnly.length === 11 && digitsOnly.startsWith('506')) {
        return '+' + digitsOnly;
      }
      return phone;
    };
    
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      const d = R * c;
      return d;
    };
    
    const groupedByPhone = {};
    for (const p of properties) {
      const normPhone = normalizePhoneNumber(p.signPhoneNumber);
      if (!normPhone) continue;
      
      if (!groupedByPhone[normPhone]) {
        groupedByPhone[normPhone] = [];
      }
      groupedByPhone[normPhone].push(p);
    }
    
    let duplicateCount = 0;
    const reportedPairs = new Set();
    
    for (const phone in groupedByPhone) {
      const props = groupedByPhone[phone];
      if (props.length > 1) {
        for (let i = 0; i < props.length; i++) {
          for (let j = i + 1; j < props.length; j++) {
            const p1 = props[i];
            const p2 = props[j];
            
            if (!p1.location || !p2.location) continue;
            
            const loc1 = typeof p1.location === 'string' ? JSON.parse(p1.location) : p1.location;
            const loc2 = typeof p2.location === 'string' ? JSON.parse(p2.location) : p2.location;
            
            const lat1 = parseFloat(loc1.lat);
            const lng1 = parseFloat(loc1.lng);
            const lat2 = parseFloat(loc2.lat);
            const lng2 = parseFloat(loc2.lng);
            
            if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) continue;
            
            const distance = getDistance(lat1, lng1, lat2, lng2);
            
            if (distance <= 20) {
              const pairId = [p1.id, p2.id].sort().join('-');
              if (!reportedPairs.has(pairId)) {
                console.log(`Duplicate found! Phone: ${phone}, Dist: ${distance.toFixed(2)}m -> Props: ${p1.propertyId} and ${p2.propertyId}`);
                reportedPairs.add(pairId);
                duplicateCount++;
              }
            }
          }
        }
      }
    }
    
    console.log(`Total duplicate pairs found (<= 20m): ${duplicateCount}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkDuplicates();
