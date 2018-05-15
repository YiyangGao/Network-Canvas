import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

import { actionCreators as sessionsActions } from '../ducks/modules/sessions';
import { getPromptForCurrentSession } from '../selectors/session';

export default function withPrompt(WrappedComponent) {
  class WithPrompt extends Component {
    prompts() {
      return this.props.stage.prompts;
    }

    promptsCount() {
      return this.prompts().length;
    }

    prompt() {
      return this.prompts()[this.props.promptIndex];
    }

    promptForward = () => {
      this.props.updatePrompt(this.props.sessionId,
        (this.promptsCount() + this.props.promptIndex + 1) % this.promptsCount(),
      );
    }

    promptBackward = () => {
      this.props.updatePrompt(this.props.sessionId,
        (this.promptsCount() + this.props.promptIndex - 1) % this.promptsCount(),
      );
    }

    render() {
      const { promptIndex, ...rest } = this.props;

      return (
        <WrappedComponent
          prompt={this.prompt()}
          promptForward={this.promptForward}
          promptBackward={this.promptBackward}
          {...rest}
        />
      );
    }
  }
  WithPrompt.propTypes = {
    stage: PropTypes.object.isRequired,
    promptIndex: PropTypes.number,
    sessionId: PropTypes.string.isRequired,
    updatePrompt: PropTypes.func.isRequired,
  };

  WithPrompt.defaultProps = {
    promptIndex: 0,
  };

  function mapStateToProps(state) {
    return {
      promptIndex: getPromptForCurrentSession(state),
      sessionId: state.session,
    };
  }

  function mapDispatchToProps(dispatch) {
    return {
      updatePrompt: bindActionCreators(sessionsActions.updatePrompt, dispatch),
    };
  }

  return connect(mapStateToProps, mapDispatchToProps)(WithPrompt);
}
