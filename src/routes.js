import React from 'react';
import PropTypes from 'prop-types';
import {
  Route,
  Redirect,
  Switch,
} from 'react-router-dom';
import { connect } from 'react-redux';

import {
  LoadParamsRoute,
  ProtocolScreen,
} from './containers';

import { SetupScreen } from './containers/Setup';

function mapStateToProps(state) {
  return {
    sessionId: state.activeSessionId,
  };
}

// If there is an activeSessionId, redirect to it
let SetupRequiredRoute = (
  { component: Component, sessionId, ...rest },
) => (
  sessionId ? (
    <Redirect to={{ pathname: `/session/${sessionId}/0` }} {...rest} />
  ) : (
    <Redirect to={{ pathname: '/setup' }} />
  )
);


SetupRequiredRoute.propTypes = {
  component: PropTypes.func.isRequired,
  sessionId: PropTypes.string.isRequired,
};

SetupRequiredRoute = connect(mapStateToProps)(SetupRequiredRoute);

export default () => (
  <Switch>
    <SetupRequiredRoute exact path="/session" component={ProtocolScreen} />
    <LoadParamsRoute path="/session/:sessionId/:stageIndex" component={ProtocolScreen} />
    <LoadParamsRoute path="/session/:sessionId" component={ProtocolScreen} />
    <LoadParamsRoute path="/reset" shouldReset component={Redirect} to={{ pathname: '/setup' }} />
    <Route path="/setup" component={SetupScreen} />
    <Redirect to={{ pathname: '/setup' }} />
  </Switch>
);

