var canvas = document.querySelector('canvas');
var statusText = document.querySelector('#statusText');

statusText.addEventListener('click', function() {
  statusText.textContent = 'Breathe...';
  heartRates = [];
  // heartRateSensor.connect()
  // .then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  // .catch(error => {
  //   statusText.textContent = error;
  // });
  onButtonClick();
});

function handleHeartRateMeasurement(heartRateMeasurement) {
  heartRateMeasurement.addEventListener('characteristicvaluechanged', event => {
    var heartRateMeasurement = heartRateSensor.parseHeartRate(event.target.value);
    statusText.innerHTML = heartRateMeasurement.heartRate + ' &#x2764;';
    heartRates.push(heartRateMeasurement.heartRate);
    drawWaves();
  });
}

var heartRates = [];
var mode = 'bar';

canvas.addEventListener('click', event => {
  mode = mode === 'bar' ? 'line' : 'bar';
  drawWaves();
});

function drawWaves() {
  requestAnimationFrame(() => {
    canvas.width = parseInt(getComputedStyle(canvas).width.slice(0, -2)) * devicePixelRatio;
    canvas.height = parseInt(getComputedStyle(canvas).height.slice(0, -2)) * devicePixelRatio;

    var context = canvas.getContext('2d');
    var margin = 2;
    var max = Math.max(0, Math.round(canvas.width / 11));
    var offset = Math.max(0, heartRates.length - max);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#00796B';
    if (mode === 'bar') {
      for (var i = 0; i < Math.max(heartRates.length, max); i++) {
        var barHeight = Math.round(heartRates[i + offset ] * canvas.height / 200);
        context.rect(11 * i + margin, canvas.height - barHeight, margin, Math.max(0, barHeight - margin));
        context.stroke();
      }
    } else if (mode === 'line') {
      context.beginPath();
      context.lineWidth = 6;
      context.lineJoin = 'round';
      context.shadowBlur = '1';
      context.shadowColor = '#333';
      context.shadowOffsetY = '1';
      for (var i = 0; i < Math.max(heartRates.length, max); i++) {
        var lineHeight = Math.round(heartRates[i + offset ] * canvas.height / 200);
        if (i === 0) {
          context.moveTo(11 * i, canvas.height - lineHeight);
        } else {
          context.lineTo(11 * i, canvas.height - lineHeight);
        }
        context.stroke();
      }
    }
  });
}

function onButtonClick() {
  serviceUuid = '00001234-0000-1000-8000-00805f9b34fb'
  characteristicUuid = '00001235-0000-1000-8000-00805f9b34fb'

  console.log('Requesting any Bluetooth Device...');
  navigator.bluetooth.requestDevice({
  // filters: [...] <- Prefer filters to save energy & show relevant devices.
      acceptAllDevices: true,
      optionalServices: [serviceUuid]})
  .then(device => {
    console.log('Connecting to GATT Server...');
    return device.gatt.connect();
  })
  .then(server => {
    console.log('Getting Service...');
    return server.getPrimaryService(serviceUuid);
  })
  .then(service => {
    console.log('Getting Characteristic...');
    return service.getCharacteristic(characteristicUuid);
  })
  .then(characteristic => {
    console.log('Reading HR Beat...');
    characteristic.readValue().then(function(hr_beat){
      console.log(hr_beat.getInt8());
      heartRates.push(hr_beat);
      statusText.innerHTML = hr_beat.getInt8() + ' &#x2764;';
      drawWaves();
    });
  })
  .catch(error => {
    console.log('Argh! ' + error);
  });
}
/* Utils */

function padHex(value) {
  return ('00' + value.toString(16).toUpperCase()).slice(-2);
}

function getUsbVendorName(value) {
  // Check out page source to see what valueToUsbVendorName object is.
  return value +
      (value in valueToUsbVendorName ? ' (' + valueToUsbVendorName[value] + ')' : '');
}

function handleCharacteristicValueChanged(event) {
  let value = event.target.value;
  let a = [];
  console.log('Received value: ' + value);
  // Convert raw data bytes to hex values just for the sake of showing something.
  // In the "real" world, you'd use data.getUint8, data.getUint16 or even
  // TextDecoder to process raw data bytes.
  for (let i = 0; i < value.byteLength; i++) {
    a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
  }
  console.log('> ' + a.join(' '));
}

/* Utils */

const valueToReportType = {
  1: 'Input Report',
  2: 'Output Report',
  3: 'Feature Report'
};

function getReportType(value) {
  let v = value.getUint8(1);
  return v + (v in valueToReportType ?
      ' (' + valueToReportType[v] + ')' : 'Unknown');
}

window.onresize = drawWaves;

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    drawWaves();
  }
});
