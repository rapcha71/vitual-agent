const { Pool } = require('pg');

async function checkNearbyProperties() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const targetPropId = '01100051';
    
    const res = await pool.query(`
      SELECT id, property_id, sign_phone_number, location, created_at, user_id
      FROM properties
      WHERE property_id = $1
    `, [targetPropId]);
    
    if (res.rows.length === 0) return;
    const targetProp = res.rows[0];
    
    let loc1 = targetProp.location;
    if (typeof loc1 === 'string') loc1 = JSON.parse(loc1);
    
    if (!loc1 || !loc1.lat) return;
    
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
    
    const nearby = [];
    for (const p of allRes.rows) {
      if (!p.location) continue;
      let loc2 = p.location;
      if (typeof loc2 === 'string') loc2 = JSON.parse(loc2);
      
      const distance = getDistance(parseFloat(loc1.lat), parseFloat(loc1.lng), parseFloat(loc2.lat), parseFloat(loc2.lng));
      
      if (distance <= 50) { // check within 50m
        nearby.push({
           property_id: p.property_id,
           phone: p.sign_phone_number,
           distance_m: distance.toFixed(1),
           created_at: p.created_at,
           user_id: p.user_id
        });
      }
    }
    
    if (nearby.length > 0) {
      console.log(`\nProperties within 50m of ${targetPropId}:`);
      console.table(nearby);
    } else {
      console.log(`\nNo properties found within 50m of ${targetPropId}.`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkNearbyProperties();
