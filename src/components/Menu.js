/* eslint-disable */
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { scrollable } from '../behaviors';
import { MenuItem } from './Elements';

/**
  * Renders the internal content of a menu
  * @param props {object}
  * props: searchField, items, toggleMenu
  * @return div
  */
function MenuInternal(props) {
  return (
    <div>
      <div className="menu__cross">
        <button onClick={props.toggleMenu} className="ui large button">
          <i className="download icon"></i>
          Cross
        </button>
      </div>
      <header>
        <h1 className="menu__title">Stages</h1>
      </header>
      {props.searchField}
      <nav>
        {props.items}
      </nav>
    </div>
  );
}
/**
  * Wrapper for menu content to allow scrolling
  */
const ScrollableMenu = scrollable(MenuInternal);

/**
  * Renders a menu, updating styles on DOM elements outside of this.
  * @extends Component
  */
class MenuFactory extends Component {
  /**
    * adds listener for key events to close Menu
    */
  componentDidMount() {
    window.onkeydown = this.listenForClose;
  }

  /**
    * adds listener for key events to close Menu
    */
  componentWillUnmount() {
    window.onkeydown = null;
  }

  listenForClose = (e) => {
    e = e || window.event;

    if (this.props.isOpen && (e.key === 'Escape' || e.keyCode === 27)) {
      this.props.toggleMenu();
    }
  }

  // intercepts click events; calls callback and toggles Menu open state
  menuItemClick = (itemClick) => {
    itemClick();
    this.props.toggleMenu();
  }

  render() {
    let items = this.props.items.map((item) =>
      <MenuItem
        key={item.id}
        to={item.to}
        onClick={() => this.menuItemClick(item.onClick)}
        title={item.title}
        isActive={item.isActive}
        imageType={item.imageType}
      />
    );

    return (
      <div className="menu">
        <div className={this.props.isOpen ? 'menu__wrap menu__wrap--isOpen' : 'menu__wrap'}>
          <div className="menu__content">
            <ScrollableMenu toggleMenu={this.props.toggleMenu} searchField={this.props.searchField} items={items} />
          </div>
        </div>
        {!this.props.isOpen && <div className="menu__burger">
          <button onClick={this.props.toggleMenu} className="ui large button">
            <i className="download icon"></i>
            Burger
          </button>
        </div>}
      </div>
    );
  } // end render
} //end class

MenuFactory.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  items: PropTypes.array,
  toggleMenu: PropTypes.func.isRequired,
  searchField: PropTypes.object
};

MenuFactory.defaultProps = {
  items: [],
  searchField: null,
}

export default MenuFactory;
