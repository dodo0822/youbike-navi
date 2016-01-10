angular.module('starter')

.factory('GmapGeocoder', function($q) {
  var geocoder = new google.maps.Geocoder;

  var factory = {
    getLocation: function(LatLng) {
      return $q(function(resolve, reject) {
        geocoder.geocode({location:LatLng}, function(resp, status) {
          if(status == google.maps.GeocoderStatus.OK) {
            resolve(resp[0]);
          } else {
            reject(status);
          }
        });
      });
    }
  };

  return factory;
});