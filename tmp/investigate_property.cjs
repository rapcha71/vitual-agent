const { Pool } = require('pg');

async function checkSpecificProperty() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const targetPropId = '01100051';
    
    // Find the target property
    const res = await pool.query(`
      SELECT 
        id, 
        property_id, 
        sign_phone_number, 
        location
      FROM properties
      WHERE property_id = $1
    `, [targetPropId]);
    
    if (res.rows.length === 0) {
      console.log(`Property ${targetPropId} not found.`);
      return;
    }
    
    const targetProp = res.rows[0];
    console.log('Target Property Details:', targetProp);
    
    const phone = targetProp.sign_phone_number;
    if (!phone) {
      console.log('This property does not have a phone number.');
    } else {
      console.log(`\nSearching for other properties with a similar phone number...`);
      
      const normalizePhoneNumber = (p) => {
        if (!p) return null;
        const digitsOnly = p.replace(/\D/g, '');
        if (digitsOnly.length === 8) return '+506' + digitsOnly;
        if (digitsOnly.length === 11 && digitsOnly.startsWith('506')) return '+' + digitsOnly;
        return p;
      };
      
      const targetNorm = normalizePhoneNumber(phone);
      
      // Get all properties to check manual normalization or partial matches
      const allRes = await pool.query(`
        SELECT id, property_id, sign_phone_number, location, created_at, user_id
        FROM properties
        WHERE id != $1
      `, [targetProp.id]);
      
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
        return R * c;
      };
      
      let loc1 = targetProp.location;
      if (typeof loc1 === 'string') loc1 = JSON.parse(loc1);
      
      const matches = [];
      for (const p of allRes.rows) {
        const norm = normalizePhoneNumber(p.sign_phone_number);
        // We match if normalized phone matches OR if they just share the same 8 digits
        const targetDigits = (phone || '').replace(/\D/g, '').slice(-8);
        const pDigits = (p.sign_phone_number || '').replace(/\D/g, '').slice(-8);
        
        if (targetDigits && targetDigits === pDigits) {
          let distance = 'N/A';
          if (loc1 && p.location) {
             let loc2 = p.location;
             if (typeof loc2 === 'string') loc2 = JSON.parse(loc2);
             distance = getDistance(parseFloat(loc1.lat), parseFloat(loc1.lng), parseFloat(loc2.lat), parseFloat(loc2.lng)).toFixed(2);
          }
          matches.push({
             property_id: p.property_id,
             phone: p.sign_phone_number,
             distance_meters: distance,
             created_at: p.created_at,
             user_id: p.user_id
          });
        }
      }
      
      if (matches.length > 0) {
        console.log(`\nFound ${matches.length} other properties with the same phone number (last 8 digits):`);
        console.table(matches);
      } else {
        console.log(`\nNo other properties found with the same phone number.`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSpecificProperty();
