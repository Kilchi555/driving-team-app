import { defineEventHandler, readBody } from 'h3';
import { getSupabaseAdmin } from '../../../server/utils/supabase';

const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

interface GeocodeResult {
  postal_code: string;
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Resolve a location name to postal code using Google Geocoding API
 * 
 * Request body:
 * {
 *   location_name: string (e.g., "Uster")
 *   tenant_id: string (optional, for filtering locations)
 * }
 * 
 * Response:
 * {
 *   postal_code: string
 *   city: string
 *   latitude: number
 *   longitude: number
 *   cached: boolean
 * }
 */
export default defineEventHandler(async (event) => {
  try {
    const { location_name, tenant_id } = await readBody(event);

    if (!location_name || typeof location_name !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'location_name is required and must be a string',
      });
    }

    if (!GOOGLE_GEOCODING_API_KEY) {
      throw createError({
        statusCode: 500,
        statusMessage: 'GOOGLE_GEOCODING_API_KEY is not configured',
      });
    }

    console.log(`🔍 Resolving postal code for location: ${location_name}`);

    const supabase = getSupabaseAdmin();

    // Step 1: Check if already cached in plz_distance_cache
    const { data: cached } = await supabase
      .from('plz_distance_cache')
      .select('postal_code, city, latitude, longitude')
      .eq('location_name', location_name)
      .single();

    if (cached) {
      console.log(`✅ Found in cache: ${location_name} -> ${cached.postal_code} ${cached.city}`);
      return {
        postal_code: cached.postal_code,
        city: cached.city,
        latitude: cached.latitude,
        longitude: cached.longitude,
        cached: true,
      };
    }

    // Step 2: Query Google Geocoding API
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      location_name
    )}&key=${GOOGLE_GEOCODING_API_KEY}`;

    console.log(`🌐 Calling Google Geocoding API for: ${location_name}`);

    const response = await fetch(googleUrl);
    const data = await response.json();

    if (!response.ok || data.status !== 'OK' || !data.results.length) {
      throw createError({
        statusCode: 404,
        statusMessage: `Could not geocode location: ${location_name}`,
      });
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry.location;

    // Extract postal code and city from address components
    let postal_code = '';
    let city = '';

    for (const component of result.address_components) {
      if (component.types.includes('postal_code')) {
        postal_code = component.short_name;
      }
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_2')) {
        // Fallback if no locality found
        if (!city) city = component.long_name;
      }
    }

    if (!postal_code || !city) {
      throw createError({
        statusCode: 400,
        statusMessage: `Could not extract postal code or city from Google result for: ${location_name}`,
      });
    }

    console.log(`✅ Google API result: ${postal_code} ${city} (${lat}, ${lng})`);

    // Step 3: Cache in plz_distance_cache
    await supabase.from('plz_distance_cache').insert({
      location_name,
      postal_code,
      city,
      latitude: lat,
      longitude: lng,
      created_at: new Date().toISOString(),
    });

    console.log(`✅ Cached: ${location_name} -> ${postal_code} ${city}`);

    // Step 4: Try to auto-populate locations table if matching name exists
    if (tenant_id) {
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', city)
        .eq('tenant_id', tenant_id)
        .single();

      if (location) {
        await supabase
          .from('locations')
          .update({
            postal_code,
            city,
            latitude: lat,
            longitude: lng,
            updated_at: new Date().toISOString(),
          })
          .eq('id', location.id);

        console.log(`✅ Auto-populated location in DB: ${city} (${postal_code})`);
      }
    }

    return {
      postal_code,
      city,
      latitude: lat,
      longitude: lng,
      cached: false,
    };
  } catch (error: any) {
    console.error('❌ Error resolving postal code:', error.message);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to resolve postal code',
    });
  }
});
