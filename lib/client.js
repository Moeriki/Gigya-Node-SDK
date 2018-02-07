'use strict';

const querystring = require('querystring');

const utils = require('./utils');

// constants

const DEFAULT_OPTIONS = {
  apiKey: null,
  connectionTimeout: 60000,
  datacenter: 'us1', // us1, eu1 or au1
  domain: 'gigya.com',
  method: null,
  nonceSize: 32,
  reqMethod: 'GET',
  secret: null,
  service: 'socialize',
  ssl: false,
};

const HTTP_BAD_REQUEST = 400;

const ONE_SECOND = 1000;

// exports

/**
 * @param {object} options
 */
function GigyaClient(options) {
  this.options = Object.assign(DEFAULT_OPTIONS, options);
}

/**
 * Handles the grunt work of creating a connection and issuing a request
 * @param {object}   request
 * @param {object}   options
 * @param {function} callback
 * @return {undefined}
 */
GigyaClient.prototype.raw = function raw(request, options, callback) {
  // Create request
  const client = utils.createClient(request, options.ssl);

  // Avoid that connections hang undefinitely
  client.setTimeout(options.connectionTimeout, () => {
    // console.log('timeout occurred');
    client.abort();
  });

  client.on('response', (response) => {
    response.setEncoding('utf8');
    const chunks = [];
    // Collect chunks
    response.on('data', (chunk) => {
      chunks.push(chunk);
    });
    // Mash all chunks together and issue the callback
    response.on('end', () => {
      let result;
      try {
        result = JSON.parse(chunks.join(''));
      } catch (err) {
        callback(err);
        return;
      }
      if (result.statusCode >= HTTP_BAD_REQUEST) {
        callback(result);
        return;
      }
      callback(null, result);
    });
  });
  // Request level errors
  client.on('error', (err) => {
    callback(new Error(`Could not execute GigyaSDK call: ${err && JSON.stringify(err)}`));
  });
  // We need to write the POST parameters to the request stream
  if (options.reqMethod.toUpperCase() === 'POST') {
    client.write(options.params);
  }
  client.end();
};

/**
 * Low level access to create and issue a Gigya request asynchronously
 * @param {object}   options
 * @param {function} [callback]
 * @return {Promise}            only if callback if omitted
 */
GigyaClient.prototype.request = function request(options, callback) {
  // Mash together all of the options
  const opts = Object.assign({}, this.options, options);

  // Create parameter string
  opts.params = options.params;
  if (opts.apiKey) {
    opts.params.apiKey = opts.apiKey;
  }
  if (opts.userKey) {
    opts.params.userKey = opts.userKey;
  }
  opts.params.format = 'json';
  if (opts.ssl === true) {
    opts.params.secret = opts.secret;
  } else {
    opts.params.timestamp = Math.round(new Date().getTime() / ONE_SECOND);
    opts.params.nonce = utils.createNonce(opts.nonceSize);
    opts.params.sig = utils.createRequestSignature(opts);
  }
  opts.params = querystring.stringify(opts.params);

  // Setup request parameters
  const requestOptions = {
    host: [opts.service, opts.datacenter, opts.domain].join('.'),
    path: `/${[opts.service, opts.method].join('.')}`,
    method: opts.reqMethod,
    headers: {
      'User-Agent': 'Node-Gigya-SDK',
    },
  };

  // Add appropriate headers in case of POST requests
  if (opts.reqMethod === 'POST') {
    requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    requestOptions.headers['Content-Length'] = opts.params.length;
  } else {
    requestOptions.path += `?${opts.params}`;
  }

  // Perform raw request
  if (typeof callback === 'function') {
    this.raw(requestOptions, opts, callback);
    return;
  }

  return new Promise((resolve, reject) => { // eslint-disable-line consistent-return
    this.raw(requestOptions, opts, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * @param {string} signature
 * @param {string} timestamp
 * @param {string} uid
 * @return {boolean}
 */
GigyaClient.prototype.validateUserSignature = function validateUserSignature(signature, timestamp, uid) {
  const base = [timestamp, uid].join('_');
  const expected = utils.createSignature(base, this.options.secret);
  return expected === signature;
};

module.exports = GigyaClient;
