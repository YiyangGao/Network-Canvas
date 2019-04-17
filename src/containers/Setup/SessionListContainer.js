import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { isEmpty } from 'lodash';
import { actionCreators as sessionsActions } from '../../ducks/modules/sessions';
import { actionCreators as dialogActions } from '../../ducks/modules/dialogs';
import { FilterableListWrapper, SessionList, NodeBin } from '../../components';
import { entityAttributesProperty } from '../../ducks/modules/network';

const displayDate = timestamp => timestamp && new Date(timestamp).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

const oneBasedIndex = i => parseInt(i || 0, 10) + 1;

const emptyView = (
  <div className="session-list-container--empty">
    <div className="getting-started">
      <h1 className="getting-started__header">No previous interviews found</h1>
      <p>
        You have no in-progress interview sessions available to resume.
        To begin a new session, select a protocol from the main start screen.
      </p>
    </div>
  </div>
);

/**
  * Display stored sessions
  */
class SessionListContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedSessions: [],
    };
  }

  onSelectSession = (session) => {
    if (this.isSelected(session.uuid)) {
      this.setState({
        selectedSessions: this.state.selectedSessions.filter(item => item !== session.uuid),
      });
    } else {
      this.setState({
        selectedSessions: [...this.state.selectedSessions, session.uuid],
      });
    }
  }

  onDeleteCard = (uuid) => {
    this.props.openDialog({
      type: 'Warning',
      title: 'Delete this interview session?',
      confirmLabel: 'Delete session',
      onConfirm: () => this.props.removeSession(uuid),
      message: (
        <p>
          This action will delete this interview session, and cannot be undone. Continue?
        </p>
      ),
    });
  };

  isSelected = uuid => this.state.selectedSessions.includes(uuid);

  render() {
    const { installedProtocols, sessions } = this.props;
    // Display most recent first, and filter out any session that doesn't have a protocol
    const sessionList = Object.keys(sessions)
      .map(key => ({ uuid: key, [entityAttributesProperty]: sessions[key] }));

    if (isEmpty(sessionList)) {
      return emptyView;
    }

    return (
      <div className="session-list-container__wrapper">
        <FilterableListWrapper
          ListComponent={SessionList}
          listComponentProps={{
            id: 'session-list-container',
            label: sessionInfo => sessionInfo[entityAttributesProperty].caseId,
            onItemSelect: this.onSelectSession,
            isItemSelected: item => this.isSelected(item.uuid),
            getKey: sessionInfo => sessionInfo.uuid,
            progress: (sessionInfo) => {
              const session = sessionInfo[entityAttributesProperty];
              const protocolStages = installedProtocols[session.protocolUID].stages.length;
              return Math.round((oneBasedIndex(session.stageIndex) / (protocolStages + 1)) * 100);
            },
            details: (sessionInfo) => {
              const session = sessionInfo[entityAttributesProperty];
              const exportedAt = session.lastExportedAt;
              const exportedDisplay = exportedAt ? new Date(exportedAt).toLocaleString() : 'never';
              const protocol = installedProtocols[session.protocolUID] || {};
              const protocolLabel = protocol.name || '[version out of date]';
              return [
                { 'Last Changed': displayDate(session.updatedAt) },
                { Protocol: protocolLabel },
                { Exported: exportedDisplay },
              ];
            },
          }}
          items={sessionList}
          initialSortOrder={[{
            property: 'updatedAt',
            direction: 'desc',
          }]}
          sortFields={[
            {
              label: 'Last Changed',
              variable: 'updatedAt',
            },
            {
              label: 'Case ID',
              variable: 'caseId',
            },
            {
              label: 'Progress',
              variable: 'stageIndex',
            },
          ]}
        />
        <NodeBin
          accepts={() => true}
          dropHandler={meta => this.onDeleteCard(meta.uuid)}
          id="NODE_BIN"
        />
      </div>
    );
  }
}

SessionListContainer.propTypes = {
  installedProtocols: PropTypes.object.isRequired,
  removeSession: PropTypes.func.isRequired,
  sessions: PropTypes.object.isRequired,
  openDialog: PropTypes.func.isRequired,
};

function mapStateToProps(state) {
  return {
    installedProtocols: state.installedProtocols,
    sessions: state.sessions,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    removeSession: bindActionCreators(sessionsActions.removeSession, dispatch),
    openDialog: bindActionCreators(dialogActions.openDialog, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SessionListContainer);
