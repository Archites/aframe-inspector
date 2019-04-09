import classnames from 'classnames';
import React from 'react';
import firebase from 'firebase';
import JSSoup from 'jssoup';
import Events from '../../lib/Events.js';
// import { saveBlob, saveString } from '../../lib/utils';
import { saveBlob } from '../../lib/utils';

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
export default class Toolbar extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      isPlaying: false
    };

    var config = {
      apiKey: 'AIzaSyA8_QEUXbgz3qZTAQkYldpMNBuVd7uv3-Y',
      authDomain: 'vr-chitech.firebaseapp.com',
      databaseURL: 'https://vr-chitech.firebaseio.com',
      projectId: 'vr-chitech',
      storageBucket: 'vr-chitech.appspot.com',
      messagingSenderId: '294689746221'
    };

    firebase.initializeApp(config);
    // console.log(firebase);
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
    // const xhr = new XMLHttpRequest();
    // xhr.open('POST', 'http://localhost:51234/save');
    // xhr.onerror = () => {
    //   alert('aframe-watcher not running. This feature requires a companion service running locally. npm install aframe-watcher to save changes back to file. Read more at supermedium.com/aframe-watcher');
    // };
    // xhr.setRequestHeader('Content-Type', 'application/json');
    // xhr.send(JSON.stringify(AFRAME.INSPECTOR.history.updates));
    // const ref = firebase.database().ref(window.location.pathname.replace(/\//g, ''));
    const ref = firebase.database().ref('room1');
    const historyUpdate = AFRAME.INSPECTOR.history.updates;

    if (Object.keys(historyUpdate).length === 0) {
      console.log('Do not update history'); return;
    }

    ref.on('value', function (snapshot) {
      if (!snapshot.exists()) {
        console.log('Firebase has not references database'); return;
      }
      const htmlTag = snapshot.val();
      let soup = new JSSoup(htmlTag);

      Object.keys(historyUpdate).forEach(key => {
        if (soup.find('a-entity', {id: key}) !== undefined) {
          if ('position' in historyUpdate[key]) soup.find('Entity', {id: key}).attrs['position'] = historyUpdate[key]['position'];
          if ('rotation' in historyUpdate[key]) soup.find('Entity', {id: key}).attrs['rotaion'] = historyUpdate[key]['rotaion'];
          ref.set(soup.prettify()).then(() => console.log('Save success'));
        } else {
          console.log('test version');
        }
      });
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
          <a
            className="gltfIcon"
            title="Export to GLTF"
            onClick={this.exportSceneToGLTF}>
            <img src={process.env.NODE_ENV === 'production' ? 'https://aframe.io/aframe-inspector/assets/gltf.svg' : '../assets/gltf.svg'} />
          </a>
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
