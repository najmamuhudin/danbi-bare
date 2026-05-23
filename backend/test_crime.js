const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/classify/text', { text: 'Ninkan ayaa dil u geystay qof kale.' });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
