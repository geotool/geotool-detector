'use strict';

var axios = require('axios');
var when = require('when');
var debug = require('geotool-commons').getDebugger('geotool:detector');

var Detector = function Detector(params) {
	debug && debug(' + constructor begin ...');

	params = params || {};
	params.profiles = params.profiles || ['default'];

	var geoCoders = [];
	var defaultGeoCoders = [{
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
	}, {
		profile: 'google',
		name: 'googlemaps',
		converter: function(lat, lng, callback) {
			if (window.google && window.google.maps) {
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
		profile: 'geomaptool',
		name: 'geomaptool',
		converter: function(lat, lng, callback) {
			axios.get('https://geomaptool.com/geoinfo', {
				params: { format: 'json', lat: lat, lon: lng },
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
	defaultGeoCoders.forEach(function(geoCoder) {
		geoCoder.profile = geoCoder.profile || 'default';
		if (params.profiles.indexOf(geoCoder.profile) >= 0) {
			geoCoders.push(geoCoder);
		}
	});

	var geolocationDetector = function() {
		return when.promise(function(resolve, reject) {
			if (geoCoders.length === 0) {
				reject({ msg: 'GeoCoders array is empty' });
			} else if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function success(position) {
					var lat = position.coords.latitude;
					var lng = position.coords.longitude;
					var count = 0;
					geoCoders.forEach(function(geoCoder) {
						geoCoder.converter(lat, lng, function(error, result) {
							count++;
							if (!error && result) {
								resolve(result);
							}
							if (count == geoCoders.length) {
								reject({ msg: 'All of geoCoders have been failed' });
							}
						});
					});
				}, function error() {
					reject({ msg: "getCurrentPosition() failed" });
					return;
				});
			} else {
				reject({ msg: 'navigator.geolocation is not available' });
			}
		});
	};

	var geoipCheckers = params.geoipCheckers || [];
	if (!(geoipCheckers instanceof Array) || geoipCheckers.length === 0) {
		geoipCheckers = [{
			url: 'https://ipinfo.io/',
			transform: function(data) {
				return { country_code: data && data.country }
			}
		}, {
			url: 'https://freegeoip.net/json/',
			transform: function(data) {
				return { country_code: data && data.country_code }
			}
		}, {
			profile: 'geomaptool',
			url: 'https://geomaptool.com/geoip',
			transform: function(data) {
				return { country_code: data && data.country_code }
			}
		}];
	}
	var geoipHandlers = [];
	geoipCheckers.forEach(function(geoipChecker) {
		geoipChecker.profile = geoipChecker.profile || 'default';
		if (params.profiles.indexOf(geoipChecker.profile) < 0) return;
		geoipHandlers.push(function(callback) {
			axios.get(geoipChecker.url, {
				responseType: 'json'
			}).then(function (response) {
				debug && debug('request [%s]: %s', geoipChecker.url, JSON.stringify(response.data));
				var data = geoipChecker.transform && geoipChecker.transform(response.data || {});
				if (data.country_code) {
					callback && callback(null, { error: false, country_code: data.country_code });
				} else {
					callback && callback({ error: true, msg: 'country_code not found' }); 
				}
			}).catch(function (error) {
				callback && callback({ error: true, msg: 'error on request API' });
				debug && debug("Request Failed: " + JSON.stringify(error));
			});
		});
	});

	var geoipDetector = function() {
		return when.promise(function(resolve, reject) {
			if (geoipHandlers.length === 0) {
				reject({ msg: 'geoipHandlers array is empty' });
			} else {
				var count = 0;
				geoipHandlers.forEach(function(geoipHandler) {
					geoipHandler(function(error, result) {
						count++;
						if (!error && result) {
							resolve(result);
						}
						if (count == geoipHandlers.length) {
							reject({ msg: 'All of geoip requests have been failed' });
						}
					});
				});
			}
		});
	}

	this.detect = function(config, callback) {
		config = config || {};
		debug && debug('detect() - start with config: %s', JSON.stringify(config));
		
		var myPromise = when.promise(function(resolve, reject) {
			if (config.autodetect === 'off' || config.autodetect === 'false' || config.autodetect === 'disabled') {
				debug && debug('detect() - turnoff detection (%s)', config.autodetect);
				resolve({});
				return;
			}

			if (typeof(config.country) === 'string' && config.country.length >= 2) {
				debug && debug('detect() - preset country code (%s)', config.country);
				resolve({ country_code: config.country });
				return;
			}

			if ((typeof(config.timeout) === 'number') && (config.timeout > 0)) {
				setTimeout(function() {
					reject({ msg: 'Detection has been timeout'});
				}, config.timeout);
			}

			geolocationDetector().then(function(result) {
				debug && debug('detect() - geolocationDetector().done(): %s', JSON.stringify(result));
				resolve(result);
			}).catch(function(error) {
				debug && debug('detect() - geolocationDetector().fail(): %s', JSON.stringify(error));
				geoipDetector().then(function(result) {
					debug && debug('detect() - geoipDetector().done(): %s', JSON.stringify(result));
					resolve(result);
				}).catch(function(exception) {
					debug && debug('detect() - geoipDetector().fail(): %s', JSON.stringify(exception));
					reject(exception);
				});
			});
		});

		if (callback && (typeof(callback) === 'function')) {
			myPromise.then(function(result) {
				callback(null, result);
			}).catch(function(exception) {
				callback(exception);
			});
		} else {
			return myPromise;
		}
	}

	debug && debug(' - constructor end!');
};

module.exports = Detector;
