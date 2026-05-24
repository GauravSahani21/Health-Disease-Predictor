const https = require('https');

const API_KEY = 'AIzaSyAVf65oQh7Q5fv7AKRz-oVD78MsZmzqo8M';

function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log("API Response Status:", res.statusCode);
        if (json.error) {
           console.log("API Error:", JSON.stringify(json.error, null, 2));
        } else {
           console.log("Available Models:");
           if (json.models) {
             json.models.forEach(m => console.log(`- ${m.name}`));
           } else {
             console.log(JSON.stringify(json, null, 2));
           }
        }
      } catch (e) {
        console.log("Parse Error:", e);
        console.log("Raw Data:", data);
      }
    });
  }).on('error', (e) => {
    console.error("Request Error:", e);
  });
}

listModels();
