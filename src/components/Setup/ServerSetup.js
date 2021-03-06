import React from 'react';
import PropTypes from 'prop-types';

import { ServerCard } from '../../components/Setup';
import { Button } from '../../ui/components';

/**
 * Provides a wrapper for common server setup tasks, rendering a Server card.
 * Used for pairing & protocol selection.
 */
const ServerSetup = ({ children, handleUnpair, server }) => (
  <div className="server-setup">
    <div className="server-setup__server">
      <ServerCard className="server-setup__card" data={server} />
      <div>
        {
          handleUnpair && server.secureServiceUrl && (
            <React.Fragment>
              <h4>Select a protocol to import</h4>
              <p>Select a protocol from this Server to import onto this device.</p>
              <Button size="small" color="mustard" onClick={handleUnpair}>Unpair</Button>
            </React.Fragment>
          )
        }
      </div>
    </div>
    <React.Fragment>
      { children }
    </React.Fragment>
  </div>
);

ServerSetup.defaultProps = {
  children: [],
  handleUnpair: null,
};

ServerSetup.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]),
  handleUnpair: PropTypes.func,
  server: PropTypes.shape({
    addresses: PropTypes.array.isRequired,
    pairingServiceUrl: PropTypes.string.isRequired,
    secureServiceUrl: PropTypes.string,
    host: PropTypes.string,
  }).isRequired,
};

export default ServerSetup;
