var canvas = document.querySelector('canvas');
var statusText = document.querySelector('#statusText');
// Connection info for Microsoft Azure IOT
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var ConnectionString = require('azure-iot-device').ConnectionString;
// Connection string specific to Wearout HR monitor
var connectionString = 'HostName=iotc-76370f29-7e6f-424d-a7c1-cd7a42b16c64.azure-devices.net;DeviceId=05292775-e359-4894-9dd1-d2b923e81f02;SharedAccessKey=YTFNY1rnGYHTl7vqLGTZZ9/XYenUgwDdfmpI93hIjOU=';
var heartRate = 0;
var client = clientFromConnectionString(connectionString);


statusText.addEventListener('click', function() {
  statusText.textContent = 'Breathe...';
  heartRates = [];
  // Connect to the IOT Wearout device
  heartRateSensor.connect()
  .then(() => heartRateSensor.startNotificationsHeartRateMeasurement().then(handleHeartRateMeasurement))
  .catch(error => {
    statusText.textContent = error;
  });
  // Connect to Microsoft Azure IOT
  // Send random values
  client.open(connectCallback);
});

function handleHeartRateMeasurement(heartRateMeasurement) {
  heartRateMeasurement.addEventListener('characteristicvaluechanged', event => {
    var heartRateMeasurement = heartRateSensor.parseHeartRate(event.target.value);
    //heartRate = heartRateMeasurement;
    var outputHtml = heartRateMeasurement.heartRate + ' &#x2764;';
    statusText.innerHTML = outputHtml;
  });
}

// Handle device connection to Azure IoT Central.
var connectCallback = (err) => {
  if (err) {
    console.log(`Device could not connect to Azure IoT Central: ${err.toString()}`);
  } else {
    console.log('Device successfully connected to Azure IoT Central');
    // Send telemetry measurements to Azure IoT Central every 1 second.
    setInterval(sendTelemetryHR, 1000);
    // Setup device command callbacks
    //client.onDeviceMethod('echo', onCommandEcho);
  }
};

// Send device telemetry.
function sendTelemetryHR() {
  var heartRateMeasurement = (Math.random() * 15);
  var data = JSON.stringify({ BPM: heartRateMeasurement });
  var message = new Message(data);
  client.sendEvent(message, (err, res) => console.log(`Sent message: ${message.getData()}` +
    (err ? `; error: ${err.toString()}` : '') +
    (res ? `; status: ${res.constructor.name}` : '')));
}

var heartRates = [];
var mode = 'bar';

canvas.addEventListener('click', event => {
  mode = mode === 'bar' ? 'line' : 'bar';
  //drawWaves();
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

window.onresize = drawWaves;

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    //drawWaves();
  }
});
