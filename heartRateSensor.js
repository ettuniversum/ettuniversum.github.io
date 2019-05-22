function() {
  'use strict';

  // class HeartRateSensor {
  //   constructor() {
  //     this.device = null;
  //     this.server = null;
  //     this._characteristics = new Map();
  //   }
  //   connect() {
  //     var serviceUuid = '00001234-0000-1000-8000-00805f9b34fb'
  //     var characteristicUuid = '00001235-0000-1000-8000-00805f9b34fb'
  //
  //     console.log('Requesting any Bluetooth Device...');
  //     navigator.bluetooth.requestDevice({
  //     // filters: [...] <- Prefer filters to save energy & show relevant devices.
  //         acceptAllDevices: true,
  //         optionalServices: [serviceUuid]})
  //     .then(device => {
  //       console.log('Connecting to GATT Server...');
  //       return device.gatt.connect();
  //     })
  //     .then(server => {
  //       this.server = server;
  //       console.log('Getting Service...');
  //       return server.getPrimaryService(serviceUuid);
  //     })
  //     .then(service => {
  //       console.log('Getting Characteristic...');
  //       this._cacheCharacteristic(service, characteristicUuid)
  //       return service.getCharacteristic(characteristicUuid);
  //     })
  //     .catch(error => {
  //       console.log('Argh! ' + error);
  //     });
  //   }

  class HeartRateSensor {
  constructor() {
    this.device = null;
    this.server = null;
    this._characteristics = new Map();
  }
  connect() {
    return navigator.bluetooth.requestDevice({filters:[{services:[ '6E400001-B5A3-F393-E0A9-E50E24DCCA9E' ]}]})
    .then(device => {
      this.device = device;
      return device.gatt.connect();
    })
    .then(server => {
      this.server = server;
      return Promise.all([
        server.getPrimaryService('6E400001-B5A3-F393-E0A9-E50E24DCCA9E').then(service => {
          return Promise.all([
            //this._cacheCharacteristic(service, 'body_sensor_location'),
            this._cacheCharacteristic(service, '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'),
          ])
        })
      ]);
    })
  }

    /* Heart Rate Service */

    getBodySensorLocation() {
      return this._readCharacteristicValue('body_sensor_location')
      .then(data => {
        let sensorLocation = data.getUint8(0);
        switch (sensorLocation) {
          case 0: return 'Other';
          case 1: return 'Chest';
          case 2: return 'Wrist';
          case 3: return 'Finger';
          case 4: return 'Hand';
          case 5: return 'Ear Lobe';
          case 6: return 'Foot';
          default: return 'Unknown';
        }
     });
    }
    startNotificationsHeartRateMeasurement() {
      return this._startNotifications('6E400003-B5A3-F393-E0A9-E50E24DCCA9E');
    }
    stopNotificationsHeartRateMeasurement() {
      return this._stopNotifications('6E400003-B5A3-F393-E0A9-E50E24DCCA9E');
    }
    parseHeartRate(value) {
      // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
      value = value.buffer ? value : new DataView(value);
      let flags = value.getUint8(0);
      let rate16Bits = flags & 0x1;
      let result = {};
      let index = 1;
      if (rate16Bits) {
        result.heartRate = value.getUint16(index, /*littleEndian=*/true);
        index += 2;
      } else {
        result.heartRate = value.getUint8(index);
        index += 1;
      }
      //let contactDetected = flags & 0x2;
      //let contactSensorPresent = flags & 0x4;
      //if (contactSensorPresent) {
      //  result.contactDetected = !!contactDetected;
      //}
      //let energyPresent = flags & 0x8;
      //if (energyPresent) {
      //  result.energyExpended = value.getUint16(index, /*littleEndian=*/true);
      //  index += 2;
      //}
      //let rrIntervalPresent = flags & 0x10;
      //if (rrIntervalPresent) {
      //  let rrIntervals = [];
      //  for (; index + 1 < value.byteLength; index += 2) {
      //    rrIntervals.push(value.getUint16(index, /*littleEndian=*/true));
      //  }
      //  result.rrIntervals = rrIntervals;
      //}
      return result;
    }

    /* Utils */

    _cacheCharacteristic(service, characteristicUuid) {
      return service.getCharacteristic(characteristicUuid)
      .then(characteristic => {
        this._characteristics.set(characteristicUuid, characteristic);
      });
    }
    _readCharacteristicValue(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.readValue()
      .then(value => {
        // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
        value = value.buffer ? value : new DataView(value);
        return value;
      });
    }
    _writeCharacteristicValue(characteristicUuid, value) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.writeValue(value);
    }
    _startNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to set up characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.startNotifications()
      .then(() => characteristic);
    }
    _stopNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to remove characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.stopNotifications()
      .then(() => characteristic);
    }
  }

  window.heartRateSensor = new HeartRateSensor();

})();
