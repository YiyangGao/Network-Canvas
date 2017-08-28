/* eslint-disable no-shadow */
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import { actionCreators as modalActions } from '../ducks/modules/modals';

const modals = state => state.modals;
const modalName = (state, props) => props.name;

const modalState = createSelector(
  modals,
  modalName,
  (modals, modalName) => modals.find(modal => modal.name === modalName),
);

const modalIsOpen = createSelector(
  modalState,
  modal => (modal ? modal.open : false),
);

function modal(WrappedComponent) {
  class Modal extends Component {
    componentWillMount() {
      this.props.registerModal(this.props.name);
    }

    componentWillUnmount() {
      this.props.unregisterModal(this.props.name);
    }

    toggle = () => this.props.toggleModal(this.props.name);
    open = () => this.props.openModal(this.props.name);
    close = () => this.props.closeModal(this.props.name);

    render() {
      return (
        <WrappedComponent
          toggle={this.toggle}
          open={this.close}
          close={this.close}
          {...this.props}
        />
      );
    }
  }

  Modal.propTypes = {
    registerModal: PropTypes.func.isRequired,
    unregisterModal: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    toggleModal: PropTypes.func.isRequired,
    openModal: PropTypes.func.isRequired,
    closeModal: PropTypes.func.isRequired,
  };

  Modal.defaultProps = {
    show: false,
  };

  function mapStateToProps(state, ownProps) {
    return {
      show: modalIsOpen(state, ownProps),
    };
  }

  function mapDispatchToProps(dispatch) {
    return {
      toggleModal: bindActionCreators(modalActions.toggleModal, dispatch),
      openModal: bindActionCreators(modalActions.openModal, dispatch),
      closeModal: bindActionCreators(modalActions.closeModal, dispatch),
      registerModal: bindActionCreators(modalActions.registerModal, dispatch),
      unregisterModal: bindActionCreators(modalActions.registerModal, dispatch),
    };
  }

  return connect(mapStateToProps, mapDispatchToProps)(Modal);
}

export default modal;
