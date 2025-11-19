const request = require('supertest');

async function simpleTest() {
  try {
    console.log('Testing health endpoint...');
    const healthResponse = await request('http://localhost:8000')
      .get('/api/flights/health');
    
    console.log('Health - Status:', healthResponse.status);
    console.log('Health - Success:', healthResponse.body.success);
    
    console.log('\nTesting search endpoint...');
    const searchResponse = await request('http://localhost:8000')
      .post('/api/flights/search')
      .send({
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2025-12-02',
        passengers: 2,
        maxPrice: 1000
      });
    
    console.log('Search - Status:', searchResponse.status);
    console.log('Search - Success:', searchResponse.body.success);
    console.log('Search - Has flights:', searchResponse.body.data?.flights?.length || 0);
    
    if (!searchResponse.body.success) {
      console.log('Full response:', JSON.stringify(searchResponse.body, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

simpleTest();