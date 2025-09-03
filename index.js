// Use native Node.js fs module for GPIO control
const fs = require('fs');

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

    // Initialize GPIO using native filesystem operations
    this.gpioInitialized = false;
    this.log(`Attempting to initialize GPIO ${this.gpioPin}...`);
    
    // Try to initialize the specified GPIO pin
    this.initializeGpio(this.gpioPin);
    
    this.currentState = Characteristic.CurrentDoorState.CLOSED;
    this.targetState = Characteristic.TargetDoorState.CLOSED;

    this.service = new Service.GarageDoorOpener(this.name);
    this.service.getCharacteristic(Characteristic.CurrentDoorState)
      .on('get', this.handleCurrentDoorStateGet.bind(this));
    this.service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', this.handleTargetDoorStateGet.bind(this))
      .on('set', this.handleTargetDoorStateSet.bind(this));
  }

  // Initialize GPIO pin
  initializeGpio(pin) {
    try {
      // Export the GPIO pin
      fs.writeFileSync('/sys/class/gpio/export', pin.toString());
      
      // Set direction to output
      fs.writeFileSync(`/sys/class/gpio/gpio${pin}/direction`, 'out');
      
      this.log(`GPIO ${pin} initialized successfully`);
      this.gpioInitialized = true;
    } catch (error) {
      this.log(`Error initializing GPIO ${pin}: ${error.message}`);
      
      // Try alternative GPIO pins if the specified one fails
      const alternativePins = [18, 23, 24, 25];
      for (const altPin of alternativePins) {
        if (altPin !== pin) {
          this.log(`Trying alternative GPIO ${altPin}...`);
          try {
            fs.writeFileSync('/sys/class/gpio/export', altPin.toString());
            fs.writeFileSync(`/sys/class/gpio/gpio${altPin}/direction`, 'out');
            this.log(`GPIO ${altPin} initialized successfully as alternative`);
            this.gpioPin = altPin; // Update the pin number
            this.gpioInitialized = true;
            break;
          } catch (altError) {
            this.log(`GPIO ${altPin} also failed: ${altError.message}`);
          }
        }
      }
      
      if (!this.gpioInitialized) {
        this.log('All GPIO pins failed - running in simulation mode');
      }
    }
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
    this.log(`GPIO initialized: ${this.gpioInitialized}`);
    
    if (value === this.currentState) {
      callback();
      return;
    }

    // Pulse the relay to trigger the garage door
    if (this.gpioInitialized) {
      try {
        // Set GPIO high
        fs.writeFileSync(`/sys/class/gpio/gpio${this.gpioPin}/value`, '1');
        this.log(`GPIO ${this.gpioPin} set high`);
        
        setTimeout(() => {
          // Set GPIO low
          fs.writeFileSync(`/sys/class/gpio/gpio${this.gpioPin}/value`, '0');
          this.log(`GPIO ${this.gpioPin} set low - pulse complete`);
        }, this.pulseDuration);
      } catch (error) {
        this.log(`Error controlling GPIO: ${error.message}`);
      }
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
