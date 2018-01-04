'use strict';

const crypto = require('crypto');
const http = require('http');
const https = require('https');

// constants

const PORT_HTTP = 80;
const PORT_HTTPS = 443;

// private

/**
 * Tweaks the URI encoding formula to what OAuth expects
 * @param {*} value
 * @return {string}
 */
function encode(value) {
  if (value === null || value === '') {
    return '';
  }
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
  ;
}

// exports

/**
 * Creates an appropriate HTTP client connection and returns the request
 * @param {object}  options
 * @param {boolean} secure
 * @return {http.request}
 */
function createClient(options, secure) {
  options.port = secure ? PORT_HTTPS : PORT_HTTP;
  return (secure ? https : http).request(options);
}

/**
 * Creates a random nonce for signature
 * @param {number} size
 * @return {string}
 */
function createNonce(size) {
  const result = [];
  const chars = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  ];
  // char_pos = 0,
  const nonceCharsLength = chars.length;
  let index = 0;
  for (index = 0; index < size; index += 1) {
    result[index] = chars[Math.floor(Math.random() * nonceCharsLength)];
  }
  return result.join('');
}

/**
 * Creates an OAuth compatible signature based on request parameters
 * @param {object}  options
 * @param {string}  options.datacenter
 * @param {string}  options.domain
 * @param {string}  options.method
 * @param {object}  options.params
 * @param {string}  options.reqMethod
 * @param {string}  options.secret
 * @param {string}  options.service
 * @param {boolean} options.ssl
 * @return {string}
 */
function createRequestSignature(options) {
  const domain = [options.service, options.datacenter, options.domain].join('.');
  const path = `/${[options.service, options.method].join('.')}`;
  const proto = options.ssl ? 'https://' : 'http://';
  // Sort and encode parameters
  const params = encode(
    Object.getOwnPropertyNames(options.params)
      .map((name) => `${encode(name)}=${encode(options.params[name])}`)
      .sort()
      .join('&')
  );
  // Put together the full URL and encode it again
  const url = encode([proto, domain, path].join(''));
  // Compose the final string
  const base = [options.reqMethod.toUpperCase(), url, params].join('&');
  // Return the final signature
  return createSignature(base, options.secret);
}

/**
 * Creates a signature that Gigya is expecting for calls
 * @param {string} text string to sign
 * @param {string} key  base64 encoded client secret key
 * @return {string}
 */
function createSignature(text, key) {
  const salt = Buffer.from(key, 'base64');
  const signature = crypto.createHmac('sha1', salt).update(text, 'binary').digest('base64');
  return signature;
}

module.exports = {
  createClient,
  createNonce,
  createRequestSignature,
  createSignature,
};
