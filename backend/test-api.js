const http = require('http');

const data = JSON.stringify({
  title: "Test Update",
  description: "Test",
  caption: "",
  urgency: null,
  deadline: null,
  assigned_to: null,
  external_links: [],
  media_assets: [],
  attachment_url: null
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/tasks/54dc04e4-cc50-4e9d-8bdb-2bf7ab37bad9',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let resData = '';
  res.on('data', d => {
    resData += d;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', resData);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
