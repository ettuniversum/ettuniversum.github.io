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
  })
  .then(server => {
    console.log('Getting Device Information Service...');
    return server.getPrimaryService('device_information');
  })
  .then(service => {
    console.log('Getting Device Information Characteristics...');
    return service.getCharacteristics();
  })
  .then(characteristics => {
    let queue = Promise.resolve();
    let decoder = new TextDecoder('utf-8');
    characteristics.forEach(characteristic => {
      switch (characteristic.uuid) {

        case BluetoothUUID.getCharacteristic('manufacturer_name_string'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> Manufacturer Name String: ' + decoder.decode(value));
          });
          break;

        case BluetoothUUID.getCharacteristic('model_number_string'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> Model Number String: ' + decoder.decode(value));
          });
          break;

        case BluetoothUUID.getCharacteristic('hardware_revision_string'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> Hardware Revision String: ' + decoder.decode(value));
          });
          break;

        case BluetoothUUID.getCharacteristic('firmware_revision_string'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> Firmware Revision String: ' + decoder.decode(value));
          });
          break;

        case BluetoothUUID.getCharacteristic('software_revision_string'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> Software Revision String: ' + decoder.decode(value));
          });
          break;

        case BluetoothUUID.getCharacteristic('system_id'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> System ID: ');
            console.log('  > Manufacturer Identifier: ' +
                padHex(value.getUint8(4)) + padHex(value.getUint8(3)) +
                padHex(value.getUint8(2)) + padHex(value.getUint8(1)) +
                padHex(value.getUint8(0)));
            console.log('  > Organizationally Unique Identifier: ' +
                padHex(value.getUint8(7)) + padHex(value.getUint8(6)) +
                padHex(value.getUint8(5)));
          });
          break;

        case BluetoothUUID.getCharacteristic('ieee_11073-20601_regulatory_certification_data_list'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> IEEE 11073-20601 Regulatory Certification Data List: ' +
                decoder.decode(value));
          });
          break;

        case BluetoothUUID.getCharacteristic('pnp_id'):
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            console.log('> PnP ID:');
            console.log('  > Vendor ID Source: ' +
                (value.getUint8(0) === 1 ? 'Bluetooth' : 'USB'));
            if (value.getUint8(0) === 1) {
              console.log('  > Vendor ID: ' +
                  (value.getUint8(1) | value.getUint8(2) << 8));
            } else {
              console.log('  > Vendor ID: ' +
                  getUsbVendorName(value.getUint8(1) | value.getUint8(2) << 8));
            }
            console.log('  > Product ID: ' +
                (value.getUint8(3) | value.getUint8(4) << 8));
            console.log('  > Product Version: ' +
                (value.getUint8(5) | value.getUint8(6) << 8));
          });
          break;

        default: console.log('> Unknown Characteristic: ' + characteristic.uuid);
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
