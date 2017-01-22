var tilesApp = angular.module('tilesApp', []);

tilesApp.controller('tileCtrl', ['$scope', '$timeout',
    
  function tileCtrl($scope, $timeout) {

    var colors = [
        'rgb(237,28,36)',
        'rgb(248,96,0)',
        'rgb(248,162,0)',
        'rgb(255,242,0)',
        'rgb(141,199,63)',
        'rgb(0,166,81)',
        'rgb(0,169,157)',
        'rgb(0,174,239)',
        'rgb(0,114,188)',
        'rgb(46,49,146)',
        'rgb(146,39,143)',
        'rgb(236,0,140)',
        'rgb(237,20,91)'
    ];

    var sounds = [28,32,35,37,40,44,47,52,54,56,59,61,64]; // notes as keys on 88-key piano
    var numTiles = 144;
    var flipDelay = 300;

    var audioCtx;
    if (typeof AudioContext !== "undefined") {
      audioCtx = new AudioContext();
    } else {
      audioCtx = new webkitAudioContext();
    }
    var voices = [];
    voices[0] = new Monosynth(audioCtx); // add this client's voice array of voices (one per client)
    voices[1] = new Monosynth(audioCtx); // for now, just have two voices; eventually, add one voice each time a client connects

    var Tile = function(color) {
      this.color = color || 'none';
    };

    Tile.prototype = {

      nextColor: function nextColor(voice) {
        var tile = this;
        var i = colors.indexOf(tile.color);
        voice = voice || 0; // default to own voice
        tile.flip();
        voices[voice].pitch(sounds[(i+1) % sounds.length]);
        voices[voice].start();
        // change color just as tile flips
        $timeout(function() {
          tile.color = colors[(i+1) % colors.length];
          voices[voice].stop();
        }, flipDelay);
      },

      setColor: function setColor(color) {
        var tile = this;
        color = color || colors[0];
        var noColor = (color === 'none');
        if (!noColor) {
          var i = colors.indexOf(color);
          voices[0].pitch(sounds[i]);
          voices[0].start();
        }
        tile.flip();
        // change color just as tile flips
        $timeout(function() {
          tile.color = color;
          if (!noColor) {voices[0].stop();}
        }, flipDelay);
      },

      flip: function flip() {
        // if tile is flipped one way, flip it back the other way
        this.transform = (this.transform == 'rotateY(180deg)') ? 'rotateY(0deg)' : 'rotateY(180deg)';
      }
    };

    // var ws = new WebSocket('wss://banjo.benjikay.com/tiles');
    var ws = new WebSocket('ws://localhost:8100');
    var send = function (msg) {
      ws.send(JSON.stringify(msg));
    };

    // server request functions
    $scope.requestReset = function() {
      $scope.reset();
      send({action: 'reset'});
    };
    $scope.requestAutoFill = function() {
      $scope.autoFill();
      send({action: 'autoFill'});
    };
    $scope.requestNextColor = function($index) {
      $scope.tiles[$index].nextColor();
      send({action: 'nextColor', $index: $index});
    };

    // watch for server commands
    ws.onmessage = function(data, flags) {
      var msg = JSON.parse(data.data);

      var actions = {
        reset: function() {
          $scope.reset();
        },
        autoFill: function() {
          $scope.autoFill();
        },
        nextColor: function() {
          $scope.tiles[msg.$index].nextColor(1); // for now, just use 2nd voice for other clients
        },
      };

      actions[msg.action]();
    };

    var init = function init() {
      $scope.tiles=[];

      for (var i=0; i<numTiles; i++) {
        $scope.tiles.push(new Tile());
      }

      // get the frequency in hertz of a given piano key
      function getFreq(key) {
        return Math.pow(2, (key-49)/12) * 440;
      }

      for (var j=0, jj=sounds.length; j<jj; j++) {
        sounds[j] = getFreq(sounds[j]);
      }

      // color a tile as a hint that page is ready for user interaction
      $timeout(function() {
        $scope.tiles[0].setColor(colors[0]);
      }, 10);
    };

    // uncolor all tiles in sequence with animation
    $scope.reset = function reset(i) {
      i = i || 0;
      var delay = 1;

      $timeout(function() {
        $scope.tiles[i].setColor('none');
        if (i<$scope.tiles.length-1) {$scope.reset(i+1);}
      }, delay);
    };

    // color all tiles in sequence with animation
    $scope.autoFill = function autoFill(i) {
      i = i || 0;
      var delay = 10;

      $timeout(function() {
        $scope.tiles[i].setColor(colors[i % colors.length]);
        if (i<$scope.tiles.length-1) {$scope.autoFill(i+1);}
      }, delay);
    };

    init();
  }
]);
