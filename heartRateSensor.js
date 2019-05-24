(function() {
  'use strict';

  class HeartRateSensor {
    constructor() {
      this.device = null;
      this.server = null;
      this._characteristics = new Map();
    }
    connect() {
      return navigator.bluetooth.requestDevice({acceptAllDevices: true,
                                                optionalServices: ['generic_access']})
      .then(device => {
        this.device = device;
        return device.gatt.connect();
      })
      .then(server => {
        this.server = server;
        return Promise.all([
          server.getPrimaryService('heart_rate').then(service => {
            return Promise.all([
              this._cacheCharacteristic(service, 'heart_rate_measurement'),
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
      return this._startNotifications('heart_rate_measurement');
    }
    stopNotificationsHeartRateMeasurement() {
      return this._stopNotifications('heart_rate_measurement');
    }
    parseHeartRate(value) {
      // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
      var rb = new Uint8Array(value);
      var signal = 0
      var BPM = 0
      for (var i=0; i<rb.length; i+=2) {
          var firstByte = ('00' + rb[i].toString(16)).slice(-2);
          var hexadecimal = firstByte + ('00' + rb[i+1].toString(16)).slice(-2);
      }
      BPM = parseInt(hexadecimal, 16)
      // BPM = BPM.buffer ? BPM : new DataView(BPM);
      // let flags = BPM.getUint8(0);
      // let rate16Bits = flags & 0x1;
      // let result = {};
      // let index = 1;
      // if (rate16Bits) {
      //   result.heartRate = BPM.getUint16(index, /*littleEndian=*/true);
      //   index += 2;
      // } else {
      //   result.heartRate = BPM.getUint8(index);
      //   index += 1;
      // }
      return BPM;
    }

    /* Utils */
    _hextobin(hex_value){
      bytes = [],
      str;
      for(var i=0; i< hex.length-1; i+=2){
         bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      str = String.fromCharCode.apply(String, bytes);
      return str
    }

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
