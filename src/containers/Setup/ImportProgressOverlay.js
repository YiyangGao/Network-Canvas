import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Spinner, Modal, Button, Icon } from '../../ui/components';
import { ProgressBar } from '../../components';
import { actionCreators as importProtocolActions } from '../../ducks/modules/importProtocol';

class ImportProgressOverlay extends Component {
  constructor(props) {
    super(props);

    this.overlay = React.createRef();
    this.handleImportFinished = this.handleImportFinished.bind(this);
  }

  componentWillUpdate(newProps) {
    if (newProps.progress.step === 5) {
      this.handleImportFinished();
    }
  }

  handleImportFinished() {
    setTimeout(this.props.resetImportProtocol, 5000);
  }

  handleUpdateCaseID(value) {
    this.setState({ caseID: value });
  }


  render() {
    const { show, progress, resetImportProtocol } = this.props;

    const percentProgress = progress.step / 5;

    return (
      <Modal show={show}>
        <div className="overlay import-protocol-overlay">
          <div className="overlay__content import-protocol-overlay__content" ref={this.contentRef}>
            { progress.step === 5 ? (
              <Icon name="protocol-card" />
            ) : (
              <Spinner large />
            )}
            <h4>{progress.statusText}</h4>
            { progress.step === 5 ? (
              <Button onClick={resetImportProtocol}>Continue</Button>
            ) : (
              <ProgressBar orientation="horizontal" percentProgress={percentProgress * 100} />
            )}
          </div>
        </div>
      </Modal>
    );
  }
}

ImportProgressOverlay.propTypes = {
  show: PropTypes.bool,
  progress: PropTypes.object,
  resetImportProtocol: PropTypes.func.isRequired,
};

ImportProgressOverlay.defaultProps = {
  show: false,
  progress: null,
};

function mapDispatchToProps(dispatch) {
  return {
    resetImportProtocol: bindActionCreators(importProtocolActions.resetImportProtocol, dispatch),
  };
}

export default connect(null, mapDispatchToProps)(ImportProgressOverlay);
