import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { actionCreators as networkActions } from '../../ducks/modules/network';
import { actionCreators as modalActions } from '../../ducks/modules/modals';
import { newNodeAttributes } from '../../selectors/session';
import { activeOriginNetwork } from '../../selectors/network';

import { PromptSwiper, NodeProviderPanels, Modal, Scrollable } from '../../containers/Elements';
import { NodeList, Form } from '../../components/Elements';

const MODAL_NEW_NODE = 'MODAL_NEW_NODE';

/**
  * This would/could be specified in the protocol, and draws upon ready made components
  */
class NameGenerator extends Component {
  handleAddNode = (node, _, form) => {
    const {
      addNode,
      newNodeAttributes,
      closeModal,
    } = this.props;

    if (node) {
      addNode({ ...node, ...newNodeAttributes });
      form.reset();  // Is this the "react/redux way"?
      closeModal(MODAL_NEW_NODE);
    }
  }

  render() {
    const {
      config: {
        params: {
          form,
          prompts,
          panels,
        },
      },
      openModal,
      activeOriginNetwork,
    } = this.props;

    return (
      <div className='name-generator'>
        <div className='name-generator__prompt'>
          <PromptSwiper prompts={ prompts } />
        </div>
        <div className='name-generator__main'>
          <div className='name-generator__panels'>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <NodeProviderPanels config={ panels } />
            </div>
          </div>
          <div className='name-generator__nodes'>
            <Scrollable>
              <NodeList network={ activeOriginNetwork } />
            </Scrollable>
          </div>
          <button className='name-generator__add-person' onClick={ () => { openModal(MODAL_NEW_NODE) } }>
            Add a person
          </button>
        </div>
        <Modal name={ MODAL_NEW_NODE } >
          <Form { ...form } form={ form.formName } onSubmit={ this.handleAddNode }/>
        </Modal>
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    newNodeAttributes: newNodeAttributes(state),
    activeOriginNetwork: activeOriginNetwork(state),
  }
}

function mapDispatchToProps(dispatch) {
  return {
    addNode: bindActionCreators(networkActions.addNode, dispatch),
    closeModal: bindActionCreators(modalActions.closeModal, dispatch),
    openModal: bindActionCreators(modalActions.openModal, dispatch),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(NameGenerator);
