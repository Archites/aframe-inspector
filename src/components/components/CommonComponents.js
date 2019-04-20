import React from 'react';
import PropTypes from 'prop-types';
import { InputWidget } from '../widgets';
import DEFAULT_COMPONENTS from './DefaultComponents';
import PropertyRow from './PropertyRow';
import Collapsible from '../Collapsible';
import furniture from '../../config/furniture';
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';

import {
  updateEntity,
  getEntityClipboardRepresentation,
  printEntity
} from '../../lib/entity';
import Events from '../../lib/Events';
import Clipboard from 'clipboard';
import { saveBlob } from '../../lib/utils';

const options = [
  {
    value: 'chair',
    label: 'Chair'
  },
  {
    value: 'bed',
    label: 'Bed'
  },
  {
    value: 'sofa',
    label: 'Sofa'
  }
];

const furImageDiv = {
  display: 'inline-block',
  width: '165.5px'
};

const furImageSize = {
  width: '100%'
};

// @todo Take this out and use updateEntity?
function changeId (componentName, value) {
  var entity = AFRAME.INSPECTOR.selectedEntity;
  if (entity.id !== value) {
    entity.id = value;
    Events.emit('entityidchange', entity);
  }
}

export default class CommonComponents extends React.Component {
  static propTypes = {
    entity: PropTypes.object
  };
  state = {
    furniture: {},
    selectedOption: 'Select furniture',
    isShow: false
  }

  componentDidMount () {
    Events.on('entityupdate', detail => {
      if (detail.entity !== this.props.entity) {
        return;
      }
      if (DEFAULT_COMPONENTS.indexOf(detail.component) !== -1) {
        this.forceUpdate();
      }
    });

    Events.on('refreshsidebarobject3d', () => {
      this.forceUpdate();
    });

    var clipboard = new Clipboard('[data-action="copy-entity-to-clipboard"]', {
      text: trigger => {
        return getEntityClipboardRepresentation(this.props.entity);
      }
    });
    clipboard.on('error', e => {
      // @todo Show the error on the UI
    });
  }

  renderFurnitureImage = () => {
    const furnitureData = furniture[this.state.selectedOption.value];
    if (!this.state.isShow) {
      return null;
    }
    return (
      <div>
        {furnitureData.map((item, index) => (
          <div key={index} onClick={() => this.addComponent(item.furniture_id, this.state.selectedOption.value)} style={furImageDiv}>
            <img src={item.url} style={furImageSize}/>
          </div>
        ))}
      </div>
    );
  }

  renderCommonAttributes () {
    const entity = this.props.entity;
    // const components = entity ? entity.components : {};
    return ['position', 'rotation', 'scale', 'visible'].map(componentName => {
      const schema = AFRAME.components[componentName].schema;
      var data = entity.object3D[componentName];
      if (componentName === 'rotation') {
        data = {
          x: THREE.Math.radToDeg(entity.object3D.rotation.x),
          y: THREE.Math.radToDeg(entity.object3D.rotation.y),
          z: THREE.Math.radToDeg(entity.object3D.rotation.z)
        };
      }
      return (
        <PropertyRow
          onChange={updateEntity}
          key={componentName}
          name={componentName}
          showHelp={true}
          schema={schema}
          data={data}
          isSingle={true}
          componentname={componentName}
          entity={entity}
        />
      );
    });
  }

  addComponent = (entityID, type) => {
    const value = {
      value: 'io3d-furniture',
      label: 'io3d-furniture'
    };
    let componentName = value.value;

    var id = 1;
    var entity = this.props.entity;
    var childrenEntity = AFRAME.INSPECTOR.scene.children;
    childrenEntity.map(item => {
      if (item.el !== undefined && item.el.id !== undefined) {
        if (item.el.id.substring(0, item.el.id.length - 1) === type) {
          id = item.el.id.substring(item.el.id.length - 1, item.el.id.length);
          id++;
        }
      }
    });
    if (entity.id.substring(0, entity.id.length - 1) !== type) {
      changeId(entity, type + id);
    }
    // const newEntity = `<a-entity io3d-furniture="${entityID}"></a-entity>`
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
    entity.setAttribute('io3d-furniture', `id:${entityID}`);
    entity.setAttribute(componentName, '');
    Events.emit('componentadd', { entity: entity, component: componentName });
    ga('send', 'event', 'Components', 'addComponent', componentName);
  };

  handleChange = (selectedOption) => {
    this.setState({ selectedOption });
    this.setState({isShow: true});
  }

  getComponentsOptions () {
    const usedComponents = Object.keys(this.props.entity.components);
    var commonOptions = Object.keys(AFRAME.components)
      .filter(function (componentName) {
        return (
          AFRAME.components[componentName].multiple ||
          usedComponents.indexOf(componentName) === -1
        );
      })
      .sort()
      .map(function (value) {
        return { value: value, label: value, origin: 'loaded' };
      });

    this.options = commonOptions;
    this.options = this.options.sort(function (a, b) {
      return a.label === b.label ? 0 : a.label < b.label ? -1 : 1;
    });
  }

  exportToGLTF () {
    const entity = this.props.entity;
    AFRAME.INSPECTOR.exporters.gltf.parse(
      entity.object3D,
      function (buffer) {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        saveBlob(blob, (entity.id || 'entity') + '.glb');
      },
      { binary: true }
    );
  }

  render () {
    const entity = this.props.entity;
    if (!entity) {
      return <div />;
    }

    this.getComponentsOptions();

    const entityButtons = (
      <div>
        <a
          title="Export entity to GLTF"
          className="gltfIcon"
          onClick={event => {
            this.exportToGLTF();
            event.stopPropagation();
          }} >
          <img src={process.env.NODE_ENV === 'production' ? 'https://aframe.io/aframe-inspector/assets/gltf.svg' : '../assets/gltf.svg'} />
        </a>
        <a
          href="#"
          title="Copy entity HTML to clipboard"
          data-action="copy-entity-to-clipboard"
          className="button fa fa-clipboard"
          onClick={event => event.stopPropagation()}
        />
      </div>
    );

    return (
      <Collapsible id="componentEntityHeader" className="commonComponents">
        <div className="collapsible-header">
          {printEntity(entity)}
          {/* {entityButtons} */}
        </div>
        <div className="collapsible-content">
          <div className="propertyRow">
            <label htmlFor="id" className="text">
              ID
            </label>
            <InputWidget
              onChange={changeId}
              entity={entity}
              name="id"
              value={entity.id}
            />
          </div>
          <Dropdown options={options} onChange={this.handleChange} value={this.state.selectedOption} placeholder="Select an option" />
          {this.renderFurnitureImage()}
        </div>
      </Collapsible>
    );
  }
}
