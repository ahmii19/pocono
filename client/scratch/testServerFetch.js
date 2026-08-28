const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api/v1';

async function fetchApi(endpoint) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

async function testAll() {
  console.log('Testing API URL:', API_BASE_URL);
  try {
    const [propRes, cityRes, commRes, typeRes, amRes] = await Promise.all([
      fetchApi('/properties?limit=6'),
      fetchApi('/cities'),
      fetchApi('/communities'),
      fetchApi('/property-types'),
      fetchApi('/amenities')
    ]);

    console.log('Properties count:', propRes.data?.length);
    console.log('Cities count:', cityRes.data?.length);
    console.log('Communities count:', commRes.data?.length);
    console.log('Types count:', typeRes.data?.length);
    console.log('Amenities count:', amRes.data?.length);
  } catch (err) {
    console.error('Error during fetch:', err);
  }
}

testAll();
