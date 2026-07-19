const http = require('http');

http.get('http://localhost:3000/admin/perusahaan', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode >= 400) {
      console.log('Error Data:', data);
    } else {
      console.log('Success, HTML length:', data.length);
      // See if there's any sign of React error in the output
      if (data.includes('Application error')) {
        console.log('Found Next.js Application Error!');
      } else if (data.length < 500) {
        console.log('Output is strangely short:', data);
      } else {
        console.log('Looks like valid HTML output.');
      }
    }
  });
}).on('error', (err) => console.log('Request error:', err.message));
