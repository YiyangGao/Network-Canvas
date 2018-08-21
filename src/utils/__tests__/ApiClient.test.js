/* eslint-env jest */

import axios from 'axios';

import ApiClient from '../ApiClient';
import { decrypt } from '../shared-api/cipher';

jest.mock('axios');
jest.mock('../shared-api/cipher');

describe('ApiClient', () => {
  const respData = { device: { id: '1' }, certificate: 'CERTIFICATE', securePort: 443 };
  const axiosResp = { data: { data: respData } };

  beforeAll(() => {
    axios.post.mockResolvedValue(axiosResp);
    axios.CancelToken = {
      source: jest.fn().mockReturnValue({ token: '' }),
    };
    axios.create.mockReturnValue(axios);
  });

  beforeEach(() => {
    axios.post.mockClear();
  });

  describe('pairing confirmation', () => {
    let pairingInfo;
    beforeEach(async () => {
      // data payload is encrypted; mock it on cipher
      decrypt.mockReturnValue(JSON.stringify(respData));
      const client = new ApiClient('');
      pairingInfo = await client.confirmPairing();
    });

    it('returns device ID and secret', () => {
      expect(pairingInfo.device.id).toEqual(respData.device.id);
      expect(pairingInfo.device).toHaveProperty('secret');
    });

    it('returns an SSL cert for Server', () => {
      expect(pairingInfo.sslCertificate).toEqual(respData.certificate);
    });

    it('returns the secure port for SSL', () => {
      expect(pairingInfo.securePort).toEqual(respData.securePort);
    });
  });
});
