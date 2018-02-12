/* eslint-disable global-require */

import Zip from 'jszip';
import environments from '../environments';
import inEnvironment from '../Environment';
import { removeDirectory, ensurePathExists, readFile, writeStream, writeFile, inSequence } from '../filesystem';
import { protocolPath } from './';

const isRequired = (param) => { throw new Error(`${param} is required`); };

const prepareDestination = destination =>
  removeDirectory(destination)
    .then(() => ensurePathExists(destination));

const extractZipDirectory = inEnvironment((environment) => {
  if (environment === environments.ELECTRON) {
    const path = require('path');

    return (zipObject, destination) => {
      const extractPath = path.join(destination, zipObject.name);

      return ensurePathExists(extractPath);
    };
  }

  if (environment === environments.CORDOVA) {
    return (zipObject, destination) => {
      const extractPath = `${destination}${zipObject.name}`;

      return ensurePathExists(extractPath);
    };
  }

  throw new Error(`extractZipDir() not available on platform ${environment}`);
});

const extractZipFile = inEnvironment((environment) => {
  if (environment === environments.ELECTRON) {
    const path = require('path');

    return (zipObject, destination) => {
      const extractPath = path.join(destination, zipObject.name);

      return writeStream(extractPath, zipObject.nodeStream());
    };
  }

  if (environment === environments.CORDOVA) {
    return (zipObject, destination) => {
      const extractPath = `${destination}${zipObject.name}`;

      return zipObject.async('blob')
        .then(data => writeFile(extractPath, data));
    };
  }

  throw new Error(`extractZipFile() not available on platform ${environment}`);
});

const loadZip = inEnvironment((environment) => {
  if (environment === environments.CORDOVA || environment === environments.ELECTRON) {
    return source =>
      readFile(source)
        .then(data => Zip.loadAsync(data));
  }

  throw new Error(`loadZip() not available on platform ${environment}`);
});

const extractZip = inEnvironment((environment) => {
  if (environment === environments.CORDOVA || environment === environments.ELECTRON) {
    return (zip, destination) =>
      prepareDestination(destination)
        .then(() =>
          inSequence(
            Object.values(zip.files),
            zipObject => (
              zipObject.dir ?
                extractZipDirectory(zipObject, destination) :
                extractZipFile(zipObject, destination)
            ),
          ),
        );
  }

  throw new Error(`extractZip() not available on platform ${environment}`);
});


const importProtocol = inEnvironment((environment) => {
  if (environment === environments.ELECTRON) {
    const path = require('path');

    return (protocolFile = isRequired('protocolFile')) => {
      const protocolName = path.basename(protocolFile);
      const destination = protocolPath(protocolName);

      return loadZip(protocolFile)
        .then(zip => extractZip(zip, destination))
        .then(() => protocolName);
    };
  }

  if (environment === environments.CORDOVA) {
    return (protocolFileUri = isRequired('protocolFileUri')) => {
      const protocolName = new URL(protocolFileUri).pathname.split('/').pop();
      const destination = protocolPath(protocolName);

      return loadZip(protocolFileUri)
        .then(zip => extractZip(zip, destination))
        .then(() => protocolName);
    };
  }

  throw new Error(`importProtocol() not available on platform ${environment}`);
});

export default importProtocol;