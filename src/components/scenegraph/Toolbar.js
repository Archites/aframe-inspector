import classnames from 'classnames';
import React from 'react';
import firebase from 'firebase';
import JSSoup from 'jssoup';
import { withRouter } from 'react-router-dom';
import Events from '../../lib/Events.js';
// import { saveBlob, saveString } from '../../lib/utils';
import { saveBlob } from '../../lib/utils';
import firebaseConfig from '../../config/firebase';

// const LOCALSTORAGE_MOCAP_UI = 'aframeinspectormocapuienabled';

function filterHelpers (scene, visible) {
  scene.traverse(o => {
    if (o.userData.source === 'INSPECTOR') {
      o.visible = visible;
    }
  });
}

function getSceneName (scene) {
  return scene.id || slugify(window.location.host + window.location.pathname);
}

/**
 * Slugify the string removing non-word chars and spaces
 * @param  {string} text String to slugify
 * @return {string}      Slugified string
 */
function slugify (text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '-') // Replace all non-word chars with -
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Tools and actions.
 */
class Toolbar extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      isPlaying: false
    };

    firebase.initializeApp(firebaseConfig);
  }

  exportSceneToGLTF () {
    ga('send', 'event', 'SceneGraph', 'exportGLTF');
    const sceneName = getSceneName(AFRAME.scenes[0]);
    const scene = AFRAME.scenes[0].object3D;
    filterHelpers(scene, false);
    AFRAME.INSPECTOR.exporters.gltf.parse(
      scene,
      function (buffer) {
        filterHelpers(scene, true);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        saveBlob(blob, sceneName + '.glb');
      },
      { binary: true }
    );
  }

  addEntity () {
    Events.emit('entitycreate', { element: 'a-entity', components: {} });
  }

  /**
   * Try to write changes with aframe-inspector-watcher.
   */
  writeChanges = () => {
    // eslint-disable-next-line react/prop-types
    const { location } = this.props;
    const ref = firebase.database()
      .ref(location.state.uId)
      .child('room')
      .child(location.state.roomId)
      .child('element');
    const historyUpdate = AFRAME.INSPECTOR.history.updates;

    let newOrder = document.getElementsByClassName('new');

    if (Object.keys(historyUpdate).length === 0 && newOrder.length === 0) {
      console.log('Do not update history'); return;
    }

    ref.on('value', function (snapshot) {
      if (!snapshot.exists()) {
        console.log('Firebase has not references database'); return;
      }
      const htmlTag = snapshot.val();
      let soup = new JSSoup(htmlTag);
      let newSoup;

      if (Object.keys(historyUpdate).length === 0) {
        while (newOrder.length > 0) {
          newSoup = new JSSoup('<Entity />');
          const element = newOrder[0];
          Object.keys(element.attributes).forEach(key => {
            const attr = element.attributes[key];
            if (attr.nodeName === 'io3d-furniture') return;

            if (attr.nodeName === 'key') {
              const value = attr.nodeValue.split('=')[1];
              newSoup.attrs['io3d-furniture'] = value;
            } else if (attr.nodeName !== 'class') {
              newSoup.attrs[attr.nodeName] = attr.nodeValue;
            }
          });
          newOrder[0].classList.remove('new');
          soup.append(newSoup);
        }
        ref.set(soup.prettify());
      } else {
        while (newOrder.length > 0) {
          let newSoup = new JSSoup('<Entity />');
          const element = newOrder[0];
          Object.keys(element.attributes).forEach(key => {
            const attr = element.attributes[key];
            if (attr.nodeName === 'io3d-furniture') return;

            if (attr.nodeName === 'key') {
              const value = attr.nodeValue.split('=')[1];
              newSoup.attrs['io3d-furniture'] = value;
            } else if (attr.nodeName !== 'class') {
              newSoup.attrs[attr.nodeName] = attr.nodeValue;
            }
          });
          newOrder[0].classList.remove('new');
          soup.append(newSoup);
        }
        Object.keys(historyUpdate).forEach(key => {
          if (soup.find('Entity', {id: key}) !== undefined) {
            if ('position' in historyUpdate[key]) soup.find('Entity', {id: key}).attrs['position'] = historyUpdate[key]['position'];
            if ('rotation' in historyUpdate[key]) soup.find('Entity', {id: key}).attrs['rotaion'] = historyUpdate[key]['rotaion'];
          }
        });
        ref.set(soup.prettify());
      }
    });
  };

  toggleScenePlaying = () => {
    if (this.state.isPlaying) {
      AFRAME.scenes[0].pause();
      this.setState({isPlaying: false});
      AFRAME.scenes[0].isPlaying = true;
      document.getElementById('aframeInspectorMouseCursor').play();
      return;
    }
    AFRAME.scenes[0].isPlaying = false;
    AFRAME.scenes[0].play();
    this.setState({isPlaying: true});
  }

  render () {
    const watcherClassNames = classnames({
      button: true,
      fa: true,
      'fa-save': true
    });
    const watcherTitle = 'Write changes with aframe-watcher.';

    return (
      <div id="toolbar">
        <div className="toolbarActions">
          <a
            className="button fa fa-plus"
            title="Add a new entity"
            onClick={this.addEntity}
          />
          <a
            id="playPauseScene"
            className={'button fa ' + (this.state.isPlaying ? 'fa-pause' : 'fa-play')}
            title={this.state.isPlaying ? 'Pause scene' : 'Resume scene'}
            onClick={this.toggleScenePlaying}>
          </a>
          {/* <a
            className="gltfIcon"
            title="Export to GLTF"
            onClick={this.exportSceneToGLTF}>
            <img src={process.env.NODE_ENV === 'production' ? 'https://aframe.io/aframe-inspector/assets/gltf.svg' : '../assets/gltf.svg'} />
          </a> */}
          <a
            className={watcherClassNames}
            title={watcherTitle}
            onClick={this.writeChanges}
          />
        </div>
      </div>
    );
  }
}

export default withRouter(Toolbar);
