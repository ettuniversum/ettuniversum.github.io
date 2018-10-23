var canvas = document.querySelector('canvas');
var statusText = document.querySelector('#statusText');

statusText.addEventListener('click', function() {
  statusText.textContent = 'Breathe...';
  heartRates = [];
  //heartRateSensor.connect()
  //.then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  //.catch(error => {
  //  statusText.textContent = error;
  //});
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
  console.log('Requesting any Bluetooth Device...');
  navigator.bluetooth.requestDevice({
   // filters: [...] <- Prefer filters to save energy & show relevant devices.
      acceptAllDevices: true,
      optionalServices: ['device_information']})
  .then(device => {
    console.log('Connecting to GATT Server...');
    return device.gatt.connect();
  }).then(server => {
    console.log('Getting Service...');
    return server.getPrimaryService('0000dfb0-0000-1000-8000-00805f9b34fb');
  })
  .then(service => {
    console.log('Getting Characteristic...');
    return service.getCharacteristic('0000dfb1-0000-1000-8000-00805f9b34fb');
  })
  .then(characteristic => {
    console.log('Getting Descriptors...');
    return characteristic.getDescriptors();
  })
  .then(descriptors => {
    let queue = Promise.resolve();
    descriptors.forEach(descriptor => {
      switch (descriptor.uuid) {

        case BluetoothUUID.getDescriptor('gatt.client_characteristic_configuration'):
          queue = queue.then(_ => descriptor.readValue()).then(value => {
            console.log('> Client Characteristic Configuration:');
            let notificationsBit = value.getUint8(0) & 0b01;
            console.log('  > Notifications: ' + (notificationsBit ? 'ON' : 'OFF'));
            let indicationsBit = value.getUint8(0) & 0b10;
            console.log('  > Indications: ' + (indicationsBit ? 'ON' : 'OFF'));
          });
          break;

        case BluetoothUUID.getDescriptor('gatt.characteristic_user_description'):
          queue = queue.then(_ => descriptor.readValue()).then(value => {
            let decoder = new TextDecoder('utf-8');
            console.log('> Characteristic User Description: ' + decoder.decode(value));
          });
          break;

        case BluetoothUUID.getDescriptor('report_reference'):
          queue = queue.then(_ => descriptor.readValue()).then(value => {
            console.log('> Report Reference:');
            console.log('  > Report ID: ' + value.getUint8(0));
            console.log('  > Report Type: ' + getReportType(value));
          });
          break;

        default: console.log('> Unknown Descriptor: ' + descriptor.uuid);
      }
    });
    return queue;
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
