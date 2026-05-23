// Polyfill for FormData in Node.js
class FormData {
  constructor() {
    this._data = [];
  }

  append(key, value, options = {}) {
    this._data.push({ key, value, options });
  }

  getBuffer() {
    return Buffer.from('');
  }

  getHeaders() {
    return {
      'content-type': 'multipart/form-data; boundary=--------------------------' + Math.random().toString(36).substring(2)
    };
  }
}

module.exports = FormData;
