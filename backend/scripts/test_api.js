async function testApi() {
  try {
    const res = await fetch('http://localhost:5000/api/personnel');
    const data = await res.json();
    console.log('API /api/personnel count:', data.length);
    console.log('API Data:', data);
  } catch (err) {
    console.error('API Test error:', err.message);
  }
}

testApi();
