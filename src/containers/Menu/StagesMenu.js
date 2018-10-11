import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Timeline, StatsPanel } from '../../components/Menu';
import { Icon } from '../../ui/components';
import { stages } from '../../selectors/session';

// eslint-disable-next-line
class StagesMenu extends Component {

  render() {
    const { active, onClickInactive } = this.props;
    const handleClickInactive = !active ? onClickInactive : null;

    return (
      <React.Fragment>
        <Icon name="menu-default-interface" />
        <div className="stages-menu" onClick={handleClickInactive}>
          <div className="stages-menu__timeline">
            <div className="stages-timeline__header">
              <h1>Interview Stages</h1>
              <input className="stages-input" type="text" placeholder="Filter stages..." />
            </div>
            <Timeline items={this.props.currentStages} />
          </div>
          <StatsPanel />
        </div>
      </React.Fragment>
    );
  }
}

StagesMenu.propTypes = {
  currentStages: PropTypes.array.isRequired,
  active: PropTypes.bool,
  onClickInactive: PropTypes.func,
};

StagesMenu.defaultProps = {
  active: false,
  onClickInactive: () => {},
};

function mapStateToProps(state) {
  const currentStages = stages(state);

  return {
    currentStages,
  };
}

export default connect(mapStateToProps)(StagesMenu);
