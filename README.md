# geotool-detector

## Installation

### Browserify

Install `geotool-detector` module:

```shell
$ npm install --save geotool-detector
```

Declare detector class:

```javascript
var Detector = require('geotool-detector');
```

### In browser

```html
<script src="geotool-detector.js" charset="utf-8"></script>
```

Declare detector class:

```javascript
var Detector = geotool.Detector;
```

## Detect Geo-location

```javascript

// create detector instance
var detector = new Detector();

// request detect() method
geodetector.detect({}, function(error, result) {
	if (error) {
		console.log("Error: %s", JSON.stringify(error));
	}
	var country_code = result && (result.country_code || result.country);
	if (country_code == 'VN' || country_code == 'vn') {
		// do something for VN (set locale ~ vi, for example)
	} else {
		// default for the others
	}
});
```
