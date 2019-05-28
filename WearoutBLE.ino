
/*  PulseSensor Starter Project and Signal Tester
 *  The Best Way to Get Started  With, or See the Raw Signal of, your PulseSensor.com™ & Arduino.
 *
 *  Here is a link to the tutorial
 *  https://pulsesensor.com/pages/code-and-guide
 *
 *  WATCH ME (Tutorial Video):
 *  https://www.youtube.com/watch?v=RbB8NSRa5X4
 *
 *
-------------------------------------------------------------
1) This shows a live human Heartbeat Pulse.
2) Live visualization in Arduino's Cool "Serial Plotter".
3) Blink an LED on each Heartbeat.
4) This is the direct Pulse Sensor's Signal.
5) A great first-step in troubleshooting your circuit and connections.
6) "Human-readable" code that is newbie friendly."

*/
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#define USE_ARDUINO_INTERRUPTS false
#include <PulseSensorPlayground.h>

BLEServer *pServer = NULL;
BLECharacteristic * pTxCharacteristic;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint8_t Signal = 0;
//uint8_t BPM = 0;
const int OUTPUT_TYPE = SERIAL_PLOTTER;

//  Variables
const int PulseWire = A0;       // PulseSensor PURPLE WIRE connected to ANALOG PIN 0
const int LED13 = 13;          // The on-board Arduino LED, close to PIN 13.
int Threshold = 450;           // Determine which Signal to "count as a beat" and which to ignore.

// See the following for generating UUIDs:
// https://www.uuidgenerator.net/

#define SERVICE_UUID           "0000180D-0000-1000-8000-00805F9B34FB" // UART service UUID
#define CHARACTERISTIC_UUID_RX "00002A37-0000-1000-8000-00805F9B34FB"
#define CHARACTERISTIC_UUID_TX "00002A37-0000-1000-8000-00805F9B34FB"


PulseSensorPlayground pulseSensor;


class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();

      if (rxValue.length() > 0) {
        Serial.println("*********");
        Serial.print("Received Value: ");
        for (int i = 0; i < rxValue.length(); i++)
          Serial.print(rxValue[i]);

        Serial.println();
        Serial.println("*********");
      }
    }
};


// The SetUp Function:
void setup() {
  Serial.begin(115200);

  // Create the BLE Device
  BLEDevice::init("WearoutBLE");

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic
  pTxCharacteristic = pService->createCharacteristic(
                    CHARACTERISTIC_UUID_TX,
                      BLECharacteristic::PROPERTY_READ  |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE
                  );
                      
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic * pRxCharacteristic = pService->createCharacteristic(
                       CHARACTERISTIC_UUID_RX,
                      BLECharacteristic::PROPERTY_WRITE
                    );

  pRxCharacteristic->setCallbacks(new MyCallbacks());

  // Start the service
  pService->start();

  // Start advertising
  pServer->getAdvertising()->start();
  Serial.println("Waiting a client connection to notify...");

  // Intialize analog read with lower bit
  analogReadResolution(11);
  analogSetAttenuation(ADC_6db);
  // Configure the PulseSensor object, by assigning our variables to it. 
  pulseSensor.analogInput(PulseWire);
  pulseSensor.setSerial(Serial);
  pulseSensor.setOutputType(OUTPUT_TYPE);   
  pulseSensor.setThreshold(Threshold);   

  // Double-check the "pulseSensor" object was created and "began" seeing a signal. 
  if (pulseSensor.begin()) {
    Serial.println("We created a pulseSensor Object !");  //This prints one time at Arduino power-up,  or on Arduino reset.  
  }

}

// The Main Loop Function
void loop() {
   // Obtain pulse
   delay(20); // bluetooth stack will go into congestion, if too many packets are sent
   //pulseSensor.sawNewSample();
   pulseSensor.onSampleTime();
   int BPM = pulseSensor.getBeatsPerMinute();
   //int Signal = pulseSensor.getLatestSample();
   //Serial.println(Signal);
   uint8_t low_Byte = lowByte(BPM);
   //uint8_t high_Byte = highByte(BPM);
   int bit_len = 1;
   if (deviceConnected) {
     //if (pulseSensor.sawStartOfBeat()) {
       pTxCharacteristic->setValue(&low_Byte, bit_len);
       pTxCharacteristic->notify();
       //pTxCharacteristic->setValue(&high_Byte, bit_len);
       //pTxCharacteristic->notify();
     //}
  }

    // disconnecting
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); // give the bluetooth stack the chance to get things ready
        pServer->startAdvertising(); // restart advertising
        Serial.println("start advertising");
        oldDeviceConnected = deviceConnected;
    }
    // connecting
    if (deviceConnected && !oldDeviceConnected) {
    // do stuff here on connecting
        oldDeviceConnected = deviceConnected;
    }


}
