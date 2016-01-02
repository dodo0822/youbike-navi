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

.controller('AppController', function($scope, $http, $ionicPopup) {

	$scope.init = function() {
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
			}
		},
		stations: [],
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
			options: {}
		},
		search: {
			template: 'search.tpl.html',
			events: {
				places_changed: function(s) {
					var place = s.getPlaces()[0];
					var loc = place.geometry.location;
					console.log(place.name);
					console.log(loc.lat(), loc.lng());

					if($scope.map.navi.state == 0) {
						// open origin confirm
						var ns = $scope.$new(false);
						ns.origin = {
							name: place.name,
							lat: loc.lat(),
							lng: loc.lng()
						};
						$ionicPopup.confirm({
							templateUrl: 'setorigin.tpl.html',
							title: 'Set origin',
							scope: ns
						}).then(function(ok) {
							if(ok) {
								$scope.map.navi.state = 1;
								$scope.map.search.placeholder = 'Search destination..';
								$scope.map.search.value = '';
								$scope.map.navi.orig.name = place.name;
								$scope.map.navi.orig.lat = loc.lat();
								$scope.map.navi.orig.lng = loc.lng();
							}
						});
					} else if($scope.map.navi.state == 1) {
						var ns = $scope.$new(false);
						ns.destination = {
							name: place.name,
							lat: loc.lat(),
							lng: loc.lng()
						};
						$ionicPopup.confirm({
							templateUrl: 'setdestination.tpl.html',
							title: 'Set destination',
							scope: ns
						}).then(function(ok) {
							if(ok) {
								$scope.map.navi.state = 0;
								$scope.map.search.placeholder = 'Search origin..';
								$scope.map.search.value = '';
								$scope.map.navi.dest.name = place.name;
								$scope.map.navi.dest.lat = loc.lat();
								$scope.map.navi.dest.lng = loc.lng();
								$scope.map.navi.start();
							}
						});
					}
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
			path: [],
			state: 0,
			counter: 0,
			reset: function() {
				$scope.map.navi.state = 0;
				$scope.map.search.placeholder = 'Search origin..';
				$scope.map.search.value = '';
			},
			start: function() {
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

				//console.log(startStation);

				var dService = new google.maps.DirectionsService;
				dService.route({
					origin: $scope.map.navi.orig.lat + ',' + $scope.map.navi.orig.lng,
					destination: startStation.coords.latitude + ',' + startStation.coords.longitude,
					travelMode: google.maps.TravelMode.WALKING
				}, function(resp, status) {
					if(status == google.maps.DirectionsStatus.OK) {
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
					} else {
						$ionicPopup.alert({
							title: 'Error',
							template: '<p>Can\'t get directions!</p>'
						});
					}
				});

				dService.route({
					origin: startStation.coords.latitude + ',' + startStation.coords.longitude,
					destination: endStation.coords.latitude + ',' + endStation.coords.longitude,
					travelMode: google.maps.TravelMode.WALKING
				}, function(resp, status) {
					if(status == google.maps.DirectionsStatus.OK) {
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
					} else {
						$ionicPopup.alert({
							title: 'Error',
							template: '<p>Can\'t get directions!</p>'
						});
					}
				});

				dService.route({
					origin: endStation.coords.latitude + ',' + endStation.coords.longitude,
					destination: $scope.map.navi.dest.lat + ',' + $scope.map.navi.dest.lng,
					travelMode: google.maps.TravelMode.WALKING
				}, function(resp, status) {
					if(status == google.maps.DirectionsStatus.OK) {
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
					} else {
						$ionicPopup.alert({
							title: 'Error',
							template: '<p>Can\'t get directions!</p>'
						});
					}
				});
			}
		}
	};
})

.controller('ResetButtonController', function($scope) {
	$scope.reset = function() {
		$scope.$parent.$parent.$parent.$parent.$parent.$parent.map.navi.reset();
	};
});