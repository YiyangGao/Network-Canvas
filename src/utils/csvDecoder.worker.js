import { omit } from 'lodash';
import { entityAttributesProperty } from '../ducks/modules/network';

/**
 * Converts a CSV file into a Network Canvas node list JSON
 *
 * @param {string} data - the contents of a CSV file
 *
 * See: https://github.com/Keyang/node-csvtojson We may want to introduce buffering
 * to this function to increase performance particularly on cordova.
 *
 */

const csv = require('../../node_modules/csvtojson/browser/browser.js');

const CSVToJSONNetworkFormat = (data) => {
  const withTypeAndAttributes = node => ({
    type: node.type,
    [entityAttributesProperty]: {
      ...omit(node, 'type'),
    },
  });

  csv().fromString(data)
    .then((json) => {
      const nodeList = json.map(entry => withTypeAndAttributes(entry));
      self.postMessage({ nodes: nodeList });
    });
};

// Respond to message from parent thread
self.addEventListener('message', event => CSVToJSONNetworkFormat(event.data));
