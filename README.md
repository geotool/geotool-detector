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
<script src="dist/js/geotool-detector.js" charset="utf-8"></script>
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
geodetector.detect({
	timeout: 5000 // timeout in 5 seconds
}, function(error, result) {
	if (error) {
		console.log("Error: %s", JSON.stringify(error));
	}
	var country_code = result && result.country_code;
	if (country_code == 'VN' || country_code == 'vn') {
		// do something for VN (set locale ~ vi, for example)
	} else {
		// default for the others
	}
});
```
