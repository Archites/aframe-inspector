var firebase = require('firebase')
var fs = require('fs')
require('firebase/storage')
global.XMLHttpRequest = require("xhr2")

var config = {
  apiKey: "AIzaSyA8_QEUXbgz3qZTAQkYldpMNBuVd7uv3-Y",
  authDomain: "vr-chitech.firebaseapp.com",
  databaseURL: "https://vr-chitech.firebaseio.com",
  projectId: "vr-chitech",
  storageBucket: "vr-chitech.appspot.com",
  messagingSenderId: "294689746221"
}

firebase.initializeApp(config)
var storageRef = firebase.storage().ref()

fs.readFile('./dist/aframe-inspector.js', function(err, data) {
  if (err) throw err
  var metadata = {
    contentType: 'text/javascript',
  };

  storageRef.child('aframe-inspector.js').put(data, metadata).then(function(snapshot) {
    console.log(snapshot)
    process.exit(0)
  })
})