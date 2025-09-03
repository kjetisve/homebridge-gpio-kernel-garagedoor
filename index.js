// Use rpi-gpio library for better compatibility with newer kernels
const gpio = require('rpi-gpio');

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-gpio-garagedoor', 'GpioGarageDoor', GpioGarageDoorAccessory);
};

class GpioGarageDoorAccessory {
  constructor(log, config) {
    this.log = log;
    this.name = config.name || "Garage Door";
    this.gpioPin = config.gpioPin || 18; // Default GPIO18 (more compatible with Pi 3)
    this.pulseDuration = config.pulseDuration || 1000; // ms

    // Initialize GPIO with rpi-gpio library
    this.gpioInitialized = false;
    gpio.setup(this.gpioPin, gpio.DIR_OUT, (err) => {
      if (err) {
        this.log(`Error initializing GPIO ${this.gpioPin}: ${err.message}`);
        this.log('Plugin will run in simulation mode');
      } else {
        this.log(`GPIO ${this.gpioPin} initialized successfully`);
        this.gpioInitialized = true;
      }
    });
    
    this.currentState = Characteristic.CurrentDoorState.CLOSED;
    this.targetState = Characteristic.TargetDoorState.CLOSED;

    this.service = new Service.GarageDoorOpener(this.name);
    this.service.getCharacteristic(Characteristic.CurrentDoorState)
      .on('get', this.handleCurrentDoorStateGet.bind(this));
    this.service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', this.handleTargetDoorStateGet.bind(this))
      .on('set', this.handleTargetDoorStateSet.bind(this));
  }

  // HomeKit queries current state
  handleCurrentDoorStateGet(callback) {
    callback(null, this.currentState);
  }

  // HomeKit queries target state
  handleTargetDoorStateGet(callback) {
    callback(null, this.targetState);
  }

  // HomeKit sets target state (open or close)
  handleTargetDoorStateSet(value, callback) {
    this.log(`Setting target state to ${value === 0 ? "OPEN" : "CLOSED"}`);
    if (value === this.currentState) {
      callback();
      return;
    }

    // Pulse the relay to trigger the garage door
    if (this.gpioInitialized) {
      gpio.write(this.gpioPin, true, (err) => {
        if (err) {
          this.log(`Error setting GPIO ${this.gpioPin} high: ${err.message}`);
        } else {
          this.log(`GPIO ${this.gpioPin} set high`);
          setTimeout(() => {
            gpio.write(this.gpioPin, false, (err) => {
              if (err) {
                this.log(`Error setting GPIO ${this.gpioPin} low: ${err.message}`);
              } else {
                this.log(`GPIO ${this.gpioPin} set low - pulse complete`);
              }
            });
          }, this.pulseDuration);
        }
      });
    } else {
      this.log('GPIO not available - running in simulation mode');
    }

    // Fake the open/close process (for demo, replace with real sensor logic)
    this.currentState = Characteristic.CurrentDoorState.OPENING;
    this.service.setCharacteristic(Characteristic.CurrentDoorState, this.currentState);

    setTimeout(() => {
      this.currentState = value === 0
        ? Characteristic.CurrentDoorState.OPEN
        : Characteristic.CurrentDoorState.CLOSED;
      this.targetState = value;
      this.service.setCharacteristic(Characteristic.CurrentDoorState, this.currentState);
      callback();
    }, 4000); // Emulates door movement (4s)
  }

  getServices() {
    return [this.service];
  }
}
