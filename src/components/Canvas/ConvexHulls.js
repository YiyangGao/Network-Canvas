import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findIndex } from 'lodash';
import getAbsoluteBoundingRect from '../../utils/getAbsoluteBoundingRect';
import { ConvexHull } from './ConvexHull';


class ConvexHulls extends Component {
  constructor() {
    super();

    this.hullComponent = React.createRef();
    this.state = {
      size: { width: 0, height: 0 },
    };
  }

  componentDidMount() {
    this.updateSize();
  }

  shouldComponentUpdate() {
    this.updateSize();
    return true;
  }

  updateSize = () => {
    if (this.hullComponent.current && (
      this.state.size.width !== getAbsoluteBoundingRect(this.hullComponent.current).width ||
      this.state.size.height !== getAbsoluteBoundingRect(this.hullComponent.current).height)) {
      this.setState({
        size: {
          width: getAbsoluteBoundingRect(this.hullComponent.current).width,
          height: getAbsoluteBoundingRect(this.hullComponent.current).height,
        },
      });
    }
  }

  render() {
    const {
      nodesByGroup,
      layoutVariable,
      categoricalOptions,
    } = this.props;

    return (
      <div style={{ width: '100%', height: '100%' }} ref={this.hullComponent}>
        {Object.keys(nodesByGroup).map((group, index) => {
          const colorIndex = findIndex(categoricalOptions, ['value', group]) + 1 || 1;
          const color = `cat-color-seq-${colorIndex}`;
          return (
            <ConvexHull
              windowDimensions={this.state.size}
              color={color}
              nodePoints={nodesByGroup[group]}
              key={index}
              layoutVariable={layoutVariable}
            />
          );
        })}
      </div>
    );
  }
}

ConvexHulls.propTypes = {
  layoutVariable: PropTypes.string.isRequired,
  nodesByGroup: PropTypes.object.isRequired,
  categoricalOptions: PropTypes.array,
};

ConvexHulls.defaultProps = {
  categoricalOptions: [],
};


export default ConvexHulls;
