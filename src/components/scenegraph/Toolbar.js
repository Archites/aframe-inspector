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
    Events.emit('entitycreate', { element: 'a-entity', components: { id: '[default]' } });
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
    // const ref = firebase.database()
    //   .ref('2YzQLH3NoxfXp376sQhhEbzkeqM2')
    //   .child('room')
    //   .child('-Ld879gyWumsJ15OBdvU')
    //   .child('element');

    const historyUpdate = AFRAME.INSPECTOR.history.updates;

    var newOrder = document.getElementsByClassName('new');

    if (Object.keys(historyUpdate).length === 0 && newOrder.length === 0) {
      alert('No change occured');
      return;
    }

    ref.once('value', (snapshot) => {
      if (!snapshot.exists()) {
        console.log('Firebase has not references database'); return;
      }
      var htmlTag = snapshot.val();
      var soup = new JSSoup(htmlTag);
      var tempTag = '';

      if (Object.keys(historyUpdate).length === 0) {
        while (newOrder.length > 0) {
          tempTag += '<Entity ';
          let element = newOrder[0];
          Object.keys(element.attributes).forEach(function (key) {
            var attr = element.attributes[key];
            if (attr.nodeName === 'io3d-furniture') return;

            if (attr.nodeName === 'key') {
              let value = attr.nodeValue.split('=')[1];
              tempTag += `io3d-furniture="${value}" `;
            } else if (attr.nodeName !== 'class') {
              tempTag += `${attr.nodeName}="${attr.nodeValue}" `;
            }
          });
          tempTag += '></Entity>';
          newOrder[0].classList.remove('new');
        }
        ref.set(soup.prettify() + tempTag);
        alert('Save successful!');
      } else {
        while (newOrder.length > 0) {
          tempTag += '<Entity ';
          let element = newOrder[0];
          Object.keys(element.attributes).forEach(function (key) {
            var attr = element.attributes[key];
            if (attr.nodeName === 'io3d-furniture') return;

            if (attr.nodeName === 'key') {
              let value = attr.nodeValue.split('=')[1];
              tempTag += `io3d-furniture="${value}" `;
            } else if (attr.nodeName !== 'class') {
              tempTag += `${attr.nodeName}="${attr.nodeValue}" `;
            }
          });
          tempTag += '></Entity>';
          newOrder[0].classList.remove('new');
        }
        htmlTag = soup.prettify() + tempTag;
        soup = new JSSoup(htmlTag);
        Object.keys(historyUpdate).forEach(key => {
          if (soup.find('Entity', {id: key}) !== undefined) {
            Object.keys(historyUpdate[key]).forEach(value => {
              console.log('value => ', value);
              if (typeof historyUpdate[key][value] === 'string') {
                soup.find('Entity', {id: key}).attrs[value] = historyUpdate[key][value];
                console.log('historyUpdate[key][value] => ', historyUpdate[key][value]);
              } else {
                let temp = '';
                Object.keys(historyUpdate[key][value]).forEach(data => {
                  temp += `${data}: ${historyUpdate[key][value][data]}; `;
                });
                soup.find('Entity', {id: key}).attrs[value] = temp;
                console.log('temp => ', temp);
              }
            });
          }
        });
        ref.set(soup.prettify());
        alert('Save successful!');
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
          {/* <a
            id="playPauseScene"
            className={'button fa ' + (this.state.isPlaying ? 'fa-pause' : 'fa-play')}
            title={this.state.isPlaying ? 'Pause scene' : 'Resume scene'}
            onClick={this.toggleScenePlaying}>
          </a> */}
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
