import React from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';
import Select from 'react-select';

var DELIMITER = ' ';

function changeId (componentName, value) {
  var entity = AFRAME.INSPECTOR.selectedEntity;
  if (entity.id !== value) {
    entity.id = value;
    Events.emit('entityidchange', entity);
  }
}

export default class AddComponent extends React.Component {
  static propTypes = {
    entity: PropTypes.object
  };

  /**
   * Add blank component.
   * If component is instanced, generate an ID.
   */
  addComponent = value => {
    let componentName = value.value;

    var id = 1;
    var entity = this.props.entity;
    var childrenEntity = AFRAME.INSPECTOR.scene.children;

    childrenEntity.map(item => {
      if (item.el !== undefined && item.el.id !== '') {
        if (item.el.id.match(/[a-zA-Z]+/g)[0] === componentName) {
          id = item.el.id.substring(componentName.length);
          id++;
        }
      }
    });
    if (entity.id.match(/[a-zA-Z]+/) !== componentName) {
      changeId(entity, componentName + id);
    }
    var packageName;
    var selectedOption = this.options.filter(function(option) {
      return option.value === componentName;
    })[0];

    if (AFRAME.components[componentName].multiple) {
      const id = prompt(
        `Provide an ID for this component (e.g., 'foo' for ${componentName}__foo).`
      );
      componentName = id ? `${componentName}__${id}` : componentName;
    }

    entity.setAttribute(componentName, '');
    entity.setAttribute('class', 'new');
    Events.emit('componentadd', { entity: entity, component: componentName });
    ga('send', 'event', 'Components', 'addComponent', componentName);
  };

  /**
   * Component dropdown options.
   */
  getComponentsOptions() {
    const usedComponents = Object.keys(this.props.entity.components);
    var commonOptions = Object.keys(AFRAME.components)
      .filter(function(componentName) {
        if (componentName === 'closet' || componentName === 'door' ||
        componentName === 'floor' || componentName === 'kitchen' ||
        componentName === 'wall' || componentName === 'window') {
          return (
            AFRAME.components[componentName].multiple ||
            usedComponents.indexOf(componentName) === -1
          );
        }
      })
      .sort()
      .map(function(value) {
        return { value: value, label: value, origin: 'loaded' };
      });
    
    this.options = commonOptions;
    this.options = this.options.sort(function(a, b) {
      return a.label === b.label ? 0 : a.label < b.label ? -1 : 1;
    });
  }

  renderOption(option) {
    var bullet = (
      <span title="Component already loaded in the scene">&#9679;</span>
    );
    return (
      <strong className="option">
        {option.label} {option.origin === 'loaded' ? bullet : ''}
      </strong>
    );
  }

  render() {
    const entity = this.props.entity;
    if (!entity) {
      return <div />;
    }

    this.getComponentsOptions();

    return (
      <div id="addComponentContainer">
        <p id="addComponentHeader">COMPONENTS</p>
        <Select
          id="addComponent"
          className="addComponent"
          classNamePrefix="select"
          ref="select"
          options={this.options}
          simpleValue
          clearable={true}
          placeholder="Add component..."
          noResultsText="No components found"
          onChange={this.addComponent}
          optionRenderer={this.renderOption}
          searchable={true}
        />
      </div>
    );
  }
}

/* eslint-disable no-unused-vars */
/**
 * Check if component has multiplicity.
 */
function isComponentInstanced(entity, componentName) {
  for (var component in entity.components) {
    if (component.substr(0, component.indexOf('__')) === componentName) {
      return true;
    }
  }
}
