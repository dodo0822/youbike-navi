// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic', 'uiGmapgoogle-maps'])

.run(function($ionicPlatform) {
	$ionicPlatform.ready(function() {
		if(window.cordova && window.cordova.plugins.Keyboard) {
			// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
			// for form inputs)
			cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

			// Don't remove this line unless you know what you are doing. It stops the viewport
			// from snapping when text inputs are focused. Ionic handles this internally for
			// a much nicer keyboard experience.
			cordova.plugins.Keyboard.disableScroll(true);
		}
		if(window.StatusBar) {
			StatusBar.styleDefault();
		}
	});
})

.controller('AppController', function($scope, $http, $ionicPopup, GmapDirections, GmapGeocoder, $q, $ionicLoading) {

	$scope.showHelp = function() {
		$ionicPopup.alert({
			title: 'Hi',
			templateUrl: 'help.tpl.html',
			cssClass: 'popup'
		});
	};

	$scope.init = function() {
		$ionicLoading.show({
			template: 'Loading map...',
		});
		if(!window.localStorage['first']) {
			window.localStorage['first'] = '1';
			$ionicPopup.alert({
				title: 'Hi',
				templateUrl: 'help.tpl.html',
				cssClass: 'popup'
			});
		}

		$http.get('data/stations.json').then(function(resp) {
			for(var i = 0; i < resp.data.length; ++i) {
				resp.data[i].icon = 'img/marker_low.png';
			}
			$scope.map.stations = resp.data;
			$scope.getAvailData();
		});
	};

	$scope.getAvailData = function() {
		$http.get('http://104.155.210.19/stations').then(function(resp) {
			resp = resp.data;
			for(var i = 0; i < $scope.map.stations.length; ++i) {
				var sno = $scope.map.stations[i].id;
				var sbi = parseInt(resp[sno].sbi);
				var tot = parseInt(resp[sno].tot);
				if(sbi / tot < 0.1) {
					$scope.map.stations[i].icon = 'img/marker_low.png';
				} else {
					$scope.map.stations[i].icon = 'img/marker_ok.png';
				}
				$scope.map.stations[i].total = tot;
				$scope.map.stations[i].avail = sbi;
			}
		});
	};

	$scope.getDist = function(lat1, lng1, lat2, lng2) {
		//console.log(lat1, lng1, lat2, lng2);
		var deg2rad = function(deg) {
			return deg * (Math.PI / 180);
		};
		var R = 6371;
		var dLat = deg2rad(lat2-lat1);
		var dLng = deg2rad(lng2-lng1);
		var a = 
			Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
			Math.sin(dLng/2) * Math.sin(dLng/2);
		var c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c;
		return d;
	};

	$scope.map = {
		instance: null,
		center: {
			latitude: 25.04,
			longitude: 121.53
		},
		zoom: 13,
		events: {
			tilesloaded: function(map) {
				$scope.map.instance = map;
				$ionicLoading.hide();
				$scope.map.events.click = function(map,eventName,mouseEvent){
					$scope.map.navi.click(mouseEvent[0].latLng);
					mouseEvent[0].stop();
				}
			},
			click: function(){}
		},
		options :{
			disableDoubleClickZoom: true,
			streetViewControl: false
		},
		stations: [],
		stationOptions: {},
		markersEvents: {
			click: function(marker, eventName, model, arguments) {
				$scope.map.window.model = model;
				$scope.map.window.show = true;
			}
		},
		window: {
			marker: {},
			show: false,
			closeClick: function() {
				this.show = false;
			},
			options: {
				maxWidth: 300
			},
			onSet: function(){

				var site = $scope.map.window.model;
				var loc = {
					name:  site.name + " Youbike站",
					coords: site.coords
				}
				$scope.map.addEndpoint(site);
			}	
		},
		addEndpoint: function(loc){
			// loc : { name, coords:{latitude,longitude} }
			var ns = $scope.$new(false);
			var ngloc = {
			  name: loc.name,
			  lat: loc.coords.latitude,
			  lng: loc.coords.longitude
			  };
			if($scope.map.navi.state == 0) {
        // open origin confirm
        $scope.map.navi.reset(true);
        ns.origin = ngloc;
        $ionicPopup.confirm({
          templateUrl: 'setorigin.tpl.html',
          title: 'Set origin',
          scope: ns
        }).then(function(ok) {
          if(ok) {
            $scope.map.navi.state = 1;
            $scope.map.search.placeholder = 'Search destination..';
            $scope.map.search.value = '';
            $scope.map.navi.orig = ngloc;
            $scope.map.window.show = false;
            loc.id = "start";
            loc.options = { 
            	zIndex: 9999,
            	title: 'Start',
            	label: "S",
            	animation: google.maps.Animation.DROP
            };
            $scope.map.navi.endpoints.push(loc);
            $scope.map.center = {
            	latitude: $scope.map.navi.orig.lat,
            	longitude: $scope.map.navi.orig.lng
            };
            $scope.map.zoom = 14;
          }
        });
	    } else if($scope.map.navi.state == 1) {
	    	$scope.map.navi.endpoints[0].options.animation = null;
        ns.destination = ngloc;
        $ionicPopup.confirm({
          templateUrl: 'setdestination.tpl.html',
          title: 'Set destination',
          scope: ns
        }).then(function(ok) {
          if(ok) {
            $scope.map.navi.reset();
            $scope.map.navi.dest = ngloc;
            loc.id = "end";
            loc.options = { 
            	zIndex: 9999,
            	title: "End",
            	label: "E",
            	animation: google.maps.Animation.DROP
            };
            $scope.map.navi.endpoints.push(loc);
            setTimeout($scope.map.navi.start,500);
            
            $scope.map.window.show = false;
          }
        });
      }
	  },
		search: {
			template: 'search.tpl.html',
			events: {
				places_changed: function(s) {
					var place = s.getPlaces()[0];
					var coords = place.geometry.location;
					
					var loc = {
							name: place.name,
							coords:{
								latitude: coords.lat(),
								longitude: coords.lng()
							}
					};
					$scope.map.addEndpoint(loc);
				}
			},
			placeholder: 'Search origin..',
			value: ''
		},
		navi: {
			orig: {
				name: '',
				lat: 0,
				lng: 0
			},
			dest: {
				name: '',
				lat: 0,
				lng: 0
			},
			endpoints: [],
			startStation: {},
			endStation: {},
			path: [],
			state: 0,
			counter: 0,
			complete: false,
			reset: function(cleanEndpoints) {
				if(typeof(cleanEndpoints)!='undefined' && cleanEndpoints){
					$scope.map.navi.endpoints = [];
				}
				$scope.map.navi.path = [];
				$scope.map.navi.state = 0;
				$scope.map.search.placeholder = 'Search origin..';
				$scope.map.search.value = '';
			},
			geolocation: function() {
				$ionicLoading.show({
					template: "Locating current position..."
				});
				navigator.geolocation.getCurrentPosition(function(position) {
					$ionicLoading.hide();
					$scope.map.navi.path = [];
					$scope.map.navi.counter = 0;
					var loc = {
						name: 'Your current location',
						coords: {
							latitude: position.coords.latitude,
							longitude: position.coords.longitude
						}
					};
					$scope.map.addEndpoint(loc);
				},function(err){
					$ionicPopup.alert({
						title: 'Error',
						cssClass: 'popup',
						template: '<p>An error happened: ' + err.code + ':<br> ' + err.message + '</p>'
					}).then(function(ok) {
        		$ionicLoading.hide();	
        	});
					
				});
			},
			click: function(latLng) {
				$ionicLoading.show({
					template: 'Fetching location data..'
				});
				GmapGeocoder.getLocation(latLng).then(function(resp){
					$ionicLoading.hide();
					var loc = {
							name: resp.formatted_address,
							coords: {
								latitude:resp.geometry.location.lat(),
								longitude:resp.geometry.location.lng(),
							}
						};
					$scope.map.addEndpoint(loc);
					$q.resolve();
				},function(status){
					$ionicLoading.hide();
					$ionicPopup.alert({
						title: 'Error',
						template: '<p>Can\'t get location: ' + status + '</p>'
					});
					$q.reject();
				});

			},
			start: function() {
				$ionicLoading.show({
					template: 'Calculating path..'
				});
				$scope.map.navi.path = [];
				// search nearast station
				var startStation = {};
				var startMin = 9999;
				for(var i = 0; i < $scope.map.stations.length; ++i) {
					var station = $scope.map.stations[i];
					var dist = $scope.getDist(station.coords.latitude, station.coords.longitude, $scope.map.navi.orig.lat, $scope.map.navi.orig.lng);
					//console.log(dist);
					if(dist < startMin) {
						if(station.total != undefined) {
							if(station.avail / station.total < 0.1) continue;
						}
						startMin = dist;
						startStation = station;
					}
				}

				// search nearast station
				var endStation = {};
				var endMin = 9999;
				for(var i = 0; i < $scope.map.stations.length; ++i) {
					var station = $scope.map.stations[i];
					var dist = $scope.getDist(station.coords.latitude, station.coords.longitude, $scope.map.navi.dest.lat, $scope.map.navi.dest.lng);
					//console.log(dist);
					if(dist < endMin) {
						endMin = dist;
						endStation = station;
					}
				}

				$scope.map.navi.startStation = startStation;
				$scope.map.navi.endStation = endStation;

				//console.log(startStation);
				var promises = [];
				
				promises.push(GmapDirections.getDirections(
					$scope.map.navi.orig.lat, $scope.map.navi.orig.lng,
					startStation.coords.latitude, startStation.coords.longitude
				).then(function(resp) {
					var polyline = {
						id: $scope.map.navi.counter++,
						coords: [],
						stroke: {
							color: '#FF0000',
							weight: 3
						},
						visible: true
					};
					var route = resp.routes[0];
					for(var i = 0; i < route.legs.length; ++i) {
						var leg = route.legs[i];
						for(var j = 0; j < leg.steps.length; ++j) {
							var step = leg.steps[j];
							polyline.coords.push({
								latitude: step.start_location.lat(),
								longitude: step.start_location.lng()
							});
							if(j == leg.steps.length-1) {
								polyline.coords.push({
									latitude: step.end_location.lat(),
									longitude: step.end_location.lng()
								});
							}
						}
					}
					$scope.map.navi.path.push(polyline);
					$q.resolve();
				}, function(status) {
					$ionicPopup.alert({
						title: 'Error',
						template: '<p>Can\'t get directions: ' + status + '</p>'
					});
					$q.reject();
				}));

				promises.push(GmapDirections.getDirections(
					startStation.coords.latitude, startStation.coords.longitude,
					endStation.coords.latitude, endStation.coords.longitude
				).then(function(resp) {
					var polyline = {
						id: $scope.map.navi.counter++,
						coords: [],
						stroke: {
							color: '#00FF00',
							weight: 3
						},
						visible: true
					};
					var route = resp.routes[0];
					for(var i = 0; i < route.legs.length; ++i) {
						var leg = route.legs[i];
						for(var j = 0; j < leg.steps.length; ++j) {
							var step = leg.steps[j];
							polyline.coords.push({
								latitude: step.start_location.lat(),
								longitude: step.start_location.lng()
							});
							if(j == leg.steps.length-1) {
								polyline.coords.push({
									latitude: step.end_location.lat(),
									longitude: step.end_location.lng()
								});
							}
						}
					}
					$scope.map.navi.path.push(polyline);
					$q.resolve();
				}, function(status) {
					$ionicPopup.alert({
						title: 'Error',
						template: '<p>Can\'t get directions: ' + status + '</p>'
					});
					$q.reject();
				}));

				promises.push(GmapDirections.getDirections(
					endStation.coords.latitude, endStation.coords.longitude,
					$scope.map.navi.dest.lat, $scope.map.navi.dest.lng
				).then(function(resp) {
					var polyline = {
						id: $scope.map.navi.counter++,
						coords: [],
						stroke: {
							color: '#FF0000',
							weight: 3
						},
						visible: true
					};
					var route = resp.routes[0];
					for(var i = 0; i < route.legs.length; ++i) {
						var leg = route.legs[i];
						for(var j = 0; j < leg.steps.length; ++j) {
							var step = leg.steps[j];
							polyline.coords.push({
								latitude: step.start_location.lat(),
								longitude: step.start_location.lng()
							});
							if(j == leg.steps.length-1) {
								polyline.coords.push({
									latitude: step.end_location.lat(),
									longitude: step.end_location.lng()
								});
							}
						}
					}
					$scope.map.navi.path.push(polyline);
					$q.resolve();
				}, function(status) {
					$ionicPopup.alert({
						title: 'Error',
						template: '<p>Can\'t get directions: ' + status + '</p>'
					});
					$q.reject();
				}));
				
				$q.all(promises).then(function() {
					$scope.map.center = {
						latitude: $scope.map.navi.orig.lat,
						longitude: $scope.map.navi.orig.lng
					};
					$scope.map.zoom = 16;
					$scope.map.navi.complete = true;
					$ionicLoading.hide();
					$scope.map.navi.showDirections();
				}, function() {
					$ionicLoading.hide();
				});
			},
			showDirections: function() {
				var ns = $scope.$new(false);
				ns.startStation = $scope.map.navi.startStation;
				ns.endStation = $scope.map.navi.endStation;
				ns.origin = $scope.map.navi.orig;
				ns.destination = $scope.map.navi.dest;
				$ionicPopup.alert({
					title: 'Directions',
					templateUrl: 'directions.tpl.html',
					scope: ns
				});
			}
		}
	};
})

.controller('ResetButtonController', function($scope) {
	$scope.reset = function() {
		$scope.$parent.$parent.$parent.$parent.$parent.$parent.map.navi.reset(true);
	};
})

.controller('GeolocationButtonController', function($scope) {
	$scope.geolocation = function() {
		$scope.$parent.$parent.$parent.$parent.$parent.$parent.map.navi.geolocation();
	};
});