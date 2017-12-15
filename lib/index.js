'use strict';

const GigyaClient = require('./client');
const services = require('./services');

// exports

Object.keys(services).reduce((sdk, service) => {

  /**
   * @param {object} options
   */
  function GigyaSDKService(options) {
    this.options = options;

    this.client = new GigyaClient(this.options);
  }

  GigyaSDKService.prototype = services[service].reduce(
    (proto, method) =>
      Object.assign(proto, {
        [method](params, callback) {
          return this.client.request({ service, method, params }, callback);
        },
      }),
    {}
  );

  const serviceConstructorName = `${service.slice(0, 1).toUpperCase()}${service.slice(1)}`;

  sdk[serviceConstructorName] = GigyaSDKService;

  return sdk;
}, GigyaClient);

module.exports = GigyaClient;
