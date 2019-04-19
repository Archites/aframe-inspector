var firebase = require('firebase')
var fs = require('fs')
require('firebase/storage')
global.XMLHttpRequest = require("xhr2")

var config = JSON.parse(process.argv[2].toString())
console.log(config)

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
