const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/classify/text', { text: 'This is a test crime robbery' });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
