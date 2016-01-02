angular.module('starter')

.factory('GmapDirections', function($q) {
	var dService = new google.maps.DirectionsService;

	var factory = {
		getDirections: function(origLat, origLng, destLat, destLng) {
			return $q(function(resolve, reject) {
				dService.route({
					origin: origLat + ',' + origLng,
					destination: destLat + ',' + destLng,
					travelMode: google.maps.TravelMode.WALKING
				}, function(resp, status) {
					if(status == google.maps.DirectionsStatus.OK) {
						resolve(resp);
					} else {
						reject(status);
					}
				});
			});
		}
	};

	return factory;
});