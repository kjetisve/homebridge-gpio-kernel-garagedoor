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
    // Convert user-friendly GPIO number to kernel GPIO number
    this.userGpioPin = config.gpioPin || 17; // User-friendly GPIO number (default GPIO17)
    this.gpioPin = this.convertToKernelGpio(this.userGpioPin); // Convert to kernel number
    this.pulseDuration = config.pulseDuration || 1000; // ms

    // Initialize GPIO using native filesystem operations
    this.gpioInitialized = false;
    this.log(`Attempting to initialize GPIO ${this.userGpioPin} (kernel ${this.gpioPin})...`);
    
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

  // Convert user-friendly GPIO number to kernel GPIO number
  convertToKernelGpio(userGpio) {
    // GPIO mapping for Raspberry Pi 3 (from /sys/kernel/debug/gpio)
    const gpioMapping = {
      2: 514,   // GPIO2
      3: 515,   // GPIO3
      4: 516,   // GPIO4
      5: 517,   // GPIO5
      6: 518,   // GPIO6
      7: 519,   // GPIO7
      8: 520,   // GPIO8
      9: 521,   // GPIO9
      10: 522,  // GPIO10
      11: 523,  // GPIO11
      12: 524,  // GPIO12
      13: 525,  // GPIO13
      14: 526,  // GPIO14
      15: 527,  // GPIO15
      16: 528,  // GPIO16
      17: 529,  // GPIO17
      18: 530,  // GPIO18
      19: 531,  // GPIO19
      20: 532,  // GPIO20
      21: 533,  // GPIO21
      22: 534,  // GPIO22
      23: 535,  // GPIO23
      24: 536,  // GPIO24
      25: 537,  // GPIO25
      26: 538,  // GPIO26
      27: 539   // GPIO27
    };
    
    const kernelGpio = gpioMapping[userGpio];
    if (kernelGpio) {
      this.log(`Converting GPIO ${userGpio} to kernel GPIO ${kernelGpio}`);
      return kernelGpio;
    } else {
      this.log(`Unknown GPIO ${userGpio}, using as-is`);
      return userGpio;
    }
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
      
      // Try alternative GPIO pins if the specified one fails (using GPIO pins that might be free)
      const alternativeUserPins = [10, 11, 12, 13]; // User-friendly GPIO numbers (try different pins)
      const alternativePins = alternativeUserPins.map(pin => this.convertToKernelGpio(pin));
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
        this.log(`GPIO ${this.userGpioPin} set high`);
        
        setTimeout(() => {
          // Set GPIO low
          fs.writeFileSync(`/sys/class/gpio/gpio${this.gpioPin}/value`, '0');
          this.log(`GPIO ${this.userGpioPin} set low - pulse complete`);
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
