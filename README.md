# homebridge-gpio-garagedoor

A simple [Homebridge](https://homebridge.io/) accessory for controlling a garage door opener using the GPIO pins on a Raspberry Pi.

## Features

- Exposes your garage door as a HomeKit accessory.
- Uses a relay on a GPIO pin to trigger your opener.
- Simple configuration.
- Easily extendable for sensor feedback.

## Requirements

- Homebridge running on a Raspberry Pi.
- Relay module wired to a GPIO pin (default: GPIO17).
- Node.js 14+.

## Wiring

- Connect relay IN pin to GPIO on Pi (default is GPIO17, pin 11).
- Relay VCC to 5V (pin 2 or 4), GND to GND (pin 6 or 9).
- Relay NO (Normally Open) and COM (Common) to your garage door switch inputs.

> **TIP:** Test your relay and wiring BEFORE using with Homebridge.

## Installation

1. **Install dependencies**:

   ```bash
   npm install onoff
   ```

2. **Clone or copy this repository** into your Homebridge `plugins` or `accessories` folder.

3. **Add to your Homebridge `config.json`**:

   ```json
   {
     "accessories": [
       {
         "accessory": "GpioGarageDoor",
         "name": "Garage Door",
         "gpioPin": 17,
         "pulseDuration": 1000
       }
     ]
   }
   ```

   - `gpioPin`: The GPIO pin number connected to the relay (default: 17).
   - `pulseDuration`: How long (ms) to trigger the relay for (default: 1000).

4. **Restart Homebridge**.

## Usage

The accessory will appear as a garage door in HomeKit. Tapping "Open" or "Close" will pulse the relay to trigger your opener.

> **NOTE:** This example doesn't detect the real door state. For better safety, add magnetic sensors and extend the code.

## Extend with Door Sensors

Connect a reed switch or sensor to another GPIO (e.g. GPIO18) and update the code to read it in `handleCurrentDoorStateGet`.

---

MIT License
