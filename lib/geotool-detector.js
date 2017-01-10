'use strict';

var axios = require('axios');
var when = require('when');
var debug = require('geotool-commons').debug('geotool:detector');

var Detector = function Detector(params) {
	debug && debug(' + constructor begin ...');

	params = params || {};

	var geoCoders = [{
		name: 'googlemaps',
		converter: function(lat, lng, callback) {
			if (google && google.maps) {
				var geocoder = new google.maps.Geocoder();
				var latlng = new google.maps.LatLng(lat, lng);
				geocoder.geocode({'latLng': latlng}, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var returnedData = null;
						if (results.length > 0) {
							var geocoding = results[0];
							for (var i=0; i<geocoding.address_components.length; i++) {
								var addressComp = geocoding.address_components[i] || {};
								var geocodingTypes = addressComp.types || [];
								if (geocodingTypes.indexOf('country') >= 0) {
									returnedData = { country_code: addressComp.short_name };
									break;
								}
							}
						}
						if (returnedData) {
							callback && callback(null, returnedData);
						} else {
							callback && callback({ msg: 'Country code not found', status: status });	
						}
					} else {
						callback && callback({ msg: 'Google GeoCoder failed', status: status });
					}
				});
			} else {
				callback && callback({ msg: 'Google Maps library is not available' });
			}
		},
	}, {
		name: 'openstreetmap',
		converter: function(lat, lng, callback) {
			axios.get('https://nominatim.openstreetmap.org/reverse', {
				params: { format: 'json', lat: lat, lon: lng, zoom: 18, addressdetails: 1 },
				responseType: 'json'
			}).then(function (response) {
				var data = response.data || {};
				var result = { error: false, country_code: data.address && data.address.country_code };
				callback && callback(null, result);
			}).catch(function (error) {
				callback && callback({ error: true });
				debug && debug("Request Failed: " + JSON.stringify(error));
			});
		}
	}];

	var geolocationDetector = function() {
		var detector = when.defer();

		if (true || navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function success(position) {
				var lat = position.coords.latitude;
				var lng = position.coords.longitude;
				geoCoders.forEach(function(geoCoder) {
					geoCoder.converter(lat, lng, function(error, result) {
						count++;
						if (true || detector.state() != 'resolved') {
							if (!error && result) {
								detector.resolve(result);
							}
							if (count == geoCoders.length) {
								detector.reject({ msg: 'All of geoCoders have been failed' });
							}
						}
					});
				});
			}, function error() {
				detector.reject({ msg: "getCurrentPosition() failed" });
				return;
			});
		} else {
			detector.reject({ msg: 'navigator.geolocation is not available' });
		}

		return detector.promise;
	};

	var geoipHandlers = [];

	geoipHandlers.push(function(callback) {
		axios.get('https://freegeoip.net/json/', {
			responseType: 'json'
		}).then(function (response) {
			var data = response.data || {};
			debug && debug('call freegeoip.net: %s', JSON.stringify(data));
			callback && callback(null, { error: false, country_code: data.country_code });
		}).catch(function (error) {
			callback && callback({ error: true });
			debug && debug("Request Failed: " + JSON.stringify(error));
		});
	});

	geoipHandlers.push(function(callback) {
		axios.get('https://ipinfo.io/', {
			responseType: 'json'
		}).then(function (response) {
			var data = response.data || {};
			debug && debug('call ipinfo.io: %s', JSON.stringify(data));
			callback && callback(null, { error: false, country_code: data.country });
		}).catch(function (error) {
			callback && callback({ error: true });
			debug && debug("Request Failed: " + JSON.stringify(error));
		});
	});

	var geoipDetector = function() {
		var detector = when.defer();
		var count = 0;
		geoipHandlers.forEach(function(geoipHandler) {
			geoipHandler(function(error, result) {
				count++;
				if (true || detector.state() != 'resolved') {
					if (!error && result) {
						detector.resolve(result);
					}
					if (count == geoipHandlers.length) {
						detector.reject({ msg: 'All of geoip requests have been failed' });
					}
				}
			});
		});
		return detector.promise;
	}

	this.detect = function(config, callback) {
		config = config || {};
		debug && debug('detect() - start with config: %s', JSON.stringify(config));
		
		if (config.autodetect === 'off' || config.autodetect === 'false' || config.autodetect === 'disabled') {
			debug && debug('detect() - turnoff detection (%s)', config.autodetect);
			callback && callback(null, {});
			return;
		}

		if (typeof(config.country) === 'string' && config.country.length >= 2) {
			debug && debug('detect() - preset country code (%s)', config.country);
			callback && callback(null, { country_code: config.country });
			return;
		}
		
		geolocationDetector().then(function(result) {
			debug && debug('detect() - geolocationDetector().done(): %s', JSON.stringify(result));
			callback(null, result);
		}).catch(function(error) {
			debug && debug('detect() - geolocationDetector().fail(): %s', JSON.stringify(error));
			geoipDetector().then(function(result) {
				debug && debug('detect() - geoipDetector().done(): %s', JSON.stringify(result));
				callback(null, result);
			}).catch(function(exception) {
				debug && debug('detect() - geoipDetector().fail(): %s', JSON.stringify(exception));
				callback(exception);
			});
		});
	}

	debug && debug(' - constructor end!');
};

module.exports = Detector;
