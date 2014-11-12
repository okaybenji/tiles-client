var tilesApp = angular.module('tilesApp', []);

tilesApp.controller('tileCtrl', ['$scope', '$timeout', 'socket',
    
    function tileCtrl($scope, $timeout, socket) {
        
        var colors = [
            'rgb(237,28,36)',
            'rgb(248, 96, 0)',
            'rgb(248, 162, 0)',
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
        
        var sounds = [
            130.81,
            164.81,
            196,
            220,
            261.63,
            329.63,
            392,
            523.25,
            587.33,
            659.26,
            783.99,
            880,
            1046.50
        ];
        
        var numTiles = 144;
        var flipDelay = 300;

        var Tile = function(color) {
            this.color = color || 'none';
        };
        
        //server request functions
        $scope.requestReset = function() {
            $scope.reset();
            socket.emit('requestReset');
        };
        $scope.requestAutoFill = function() {
            $scope.autoFill();
            socket.emit('requestAutoFill');
        };
        $scope.requestNextColor = function($index) {
            $scope.tiles[$index].nextColor();
            socket.emit('requestNextColor', $index);
        };
        
        //watch for server commands
        socket.on('reset', function() {
            $scope.reset();
        });
        socket.on('autoFill', function() {
            $scope.autoFill();
        });
        socket.on('nextColor', function($index) {
            $scope.tiles[$index].nextColor();
        });
        
        Tile.prototype = {
        
            nextColor: function nextColor() {
                var tile = this;
                var i = colors.indexOf(tile.color);
                tile.flip();
                startTone(sounds[(i+1)%sounds.length]);
                //change color just as tile flips
                $timeout(function() {
                    tile.color = colors[(i+1)%colors.length];
                    stopTone();
                }, flipDelay);
            },
            
            setColor: function setColor(color) {
                var tile = this;
                var color = color || colors[0];
                var noColor = (color === 'none');
                if (!noColor) {
                    var i = colors.indexOf(color);
                    startTone(sounds[i]);
                }
                tile.flip();
                //change color just as tile flips
                $timeout(function() {
                    tile.color = color;
                    if (!noColor) {stopTone()};
                }, flipDelay);
            },
            
            flip: function flip() {
                //if tile is flipped one way, flip it back the other way
                this.transform = (this.transform == 'rotateY(180deg)') ? 'rotateY(0deg)' : 'rotateY(180deg)';
            }
            
        };
        
        $scope.init = function init() {
            
            $scope.tiles=[];
            
            for (var i=0; i<numTiles; i++) {
                //$scope.tiles.push(new Tile(colors[i%colors.length])); //option A: load tiles with colors (no animation)
                $scope.tiles.push(new Tile);
            }
            
            //color a tile as a hint that page is ready for user interaction
            $timeout(function() {
                $scope.tiles[0].setColor(colors[0]);
            }, 10);
        }
        
        //uncolor all tiles in sequence with animation
        $scope.reset = function reset(i) {
            
            i = i || 0;
            var delay = 1;
            
            $timeout(function() {
                $scope.tiles[i].setColor('none');
                if (i<$scope.tiles.length-1) {$scope.reset(i+1);}
            }, delay);
        }
        
        //color all tiles in sequence with animation
        $scope.autoFill = function autoFill(i) {
            
            i = i || 0;
            var delay = 10;
            
            $timeout(function() {
                $scope.tiles[i].setColor(colors[i%colors.length]);
                if (i<$scope.tiles.length-1) {$scope.autoFill(i+1);}
            }, delay);
        }
        
        $scope.init();
        
    }
]);

tilesApp.factory('socket', function($rootScope) {
    
    var socket = io.connect();
    
    return {
        on: function(eventName, callback) {
            socket.on(eventName, function() {  
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(socket, args);
                });
            });
    },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});
