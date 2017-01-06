# geotool-detector

## Installation

```shell
$ npm install --save geotool-detector
```

## Usage

```javascript

// create geodetector instance
var geodetector = new GeoDetector();

// request detect() method
geodetector.detect({}, function(error, result) {
	if (error) {
		console.log("Error: %s", JSON.stringify(error));
	}
	result = result || {};
	result.country_code = result.country_code || result.country;
	if (result.country_code == 'VN' || result.country_code == 'vn') {
		// do something for VN (set locale ~ vi, for example)
	} else {
		// default for the others
	}
});
```
