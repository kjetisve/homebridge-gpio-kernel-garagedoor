const Gpio = require('onoff').Gpio;

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
    this.gpioPin = config.gpioPin || 17; // Default GPIO17
    this.pulseDuration = config.pulseDuration || 1000; // ms

    this.relay = new Gpio(this.gpioPin, 'out');
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
    this.relay.writeSync(1);
    setTimeout(() => {
      this.relay.writeSync(0);
    }, this.pulseDuration);

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
