const http = require('http');

const data = JSON.stringify({
    creatingFor: 'self',
    lookingFor: 'bride',
    firstName: 'Test',
    lastName: 'User',
    gender: 'male',
    dob: '1995-05-15',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    email: 'testuser9999@test.com',
    phoneNumber: '9876543210',
    password: 'TestPassword123'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', e => console.log('Error:', e.message));
req.write(data);
req.end();
