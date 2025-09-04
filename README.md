  # homebridge-gpio-kernel-garagedoor

A simple [Homebridge](https://homebridge.io/) accessory for controlling a garage door opener using the GPIO pins on a Raspberry Pi.

## Features

- Exposes your garage door as a HomeKit accessory
- Uses a relay on a GPIO pin to trigger your opener
- Simple configuration with user-friendly GPIO numbers
- Automatic GPIO numbering conversion for newer Pi OS versions
- Handles already-exported GPIO pins
- Easily extendable for sensor feedback

## Requirements

- Homebridge running on a Raspberry Pi
- Relay module wired to a GPIO pin (default: GPIO17)
- Node.js 14+
- Raspberry Pi OS (tested on Pi 3 with kernel 6.12.34)

## Wiring

- Connect relay IN pin to GPIO on Pi (default is GPIO17, pin 11).
- Relay VCC to 5V (pin 2 or 4), GND to GND (pin 6 or 9).
- Relay NO (Normally Open) and COM (Common) to your garage door switch inputs.

> **TIP:** Test your relay and wiring BEFORE using with Homebridge.

## Installation

### Method 1: Install via Homebridge UI (Recommended)

1. **Open your Homebridge UI** at `http://your-pi-ip:8581/`
2. **Navigate to Plugins tab**
3. **Click the "+" button**
4. **Select "Install from URL"**
5. **Enter**: `https://github.com/kjetisve/homebridge-gpio-kernel-garagedoor.git`
6. **Click Install**

### Method 2: Manual Installation

1. **Install the plugin**:
   ```bash
   cd /var/lib/homebridge
   npm install https://github.com/kjetisve/homebridge-gpio-kernel-garagedoor.git
   ```

2. **Add to your Homebridge `config.json`**:
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

   - `gpioPin`: The GPIO pin number connected to the relay (default: 17)
   - `pulseDuration`: How long (ms) to trigger the relay for (default: 1000)

3. **Restart Homebridge**:
   ```bash
   sudo systemctl restart homebridge
   ```

## GPIO Permissions Setup

**IMPORTANT:** On newer Raspberry Pi OS versions, you need to set up GPIO permissions for the homebridge user.

### Step 1: Add homebridge user to gpio group
```bash
sudo usermod -a -G gpio homebridge
```

### Step 2: Fix GPIO file permissions (if needed)
If you get "EACCES: permission denied" errors, run:
```bash
# For GPIO 17 (kernel 529)
sudo chmod 666 /sys/class/gpio/gpio529/direction
sudo chmod 666 /sys/class/gpio/gpio529/value

# For other GPIO pins, replace 529 with the kernel GPIO number
# GPIO 18 = 530, GPIO 23 = 535, etc.
```

### Step 3: Restart Homebridge
```bash
sudo systemctl restart homebridge
```

## GPIO Pin Mapping

This plugin automatically converts user-friendly GPIO numbers to kernel GPIO numbers for newer Pi OS versions:

| User GPIO | Kernel GPIO | Physical Pin | Notes |
|-----------|-------------|--------------|-------|
| GPIO 2    | 514         | Pin 3        | Usually free |
| GPIO 3    | 515         | Pin 5        | Usually free |
| GPIO 4    | 516         | Pin 7        | Usually free |
| GPIO 5    | 517         | Pin 29       | Usually free |
| GPIO 6    | 518         | Pin 31       | Usually free |
| GPIO 7    | 519         | Pin 26       | Usually free |
| GPIO 8    | 520         | Pin 24       | Usually free |
| GPIO 9    | 521         | Pin 21       | Usually free |
| GPIO 17   | 529         | Pin 11       | Default, may be in use |
| GPIO 18   | 530         | Pin 12       | May be in use |
| GPIO 23   | 535         | Pin 16       | May be in use |
| GPIO 24   | 536         | Pin 18       | May be in use |
| GPIO 25   | 537         | Pin 22       | May be in use |

## Troubleshooting

### "EACCES: permission denied" Error
- Make sure homebridge user is in gpio group: `groups homebridge`
- Fix GPIO file permissions: `sudo chmod 666 /sys/class/gpio/gpioXXX/direction`
- Restart Homebridge: `sudo systemctl restart homebridge`

### "EBUSY: resource busy or locked" Error
- The GPIO pin is already in use by another process
- Try a different GPIO pin (GPIO 2, 3, 4, 5, 6, 7, 8, 9 are usually free)
- Check what's using the GPIO: `ls /sys/class/gpio/ | grep gpio`

### "EINVAL: invalid argument" Error
- This plugin handles GPIO numbering conversion automatically
- Make sure you're using user-friendly GPIO numbers (17, 18, etc.) in config.json
- The plugin converts them to kernel numbers internally

### Plugin runs in simulation mode
- Check Homebridge logs for specific error messages
- Verify GPIO permissions and availability
- Test GPIO manually: `echo 1 > /sys/class/gpio/gpioXXX/value`

## Usage

The accessory will appear as a garage door in HomeKit. Tapping "Open" or "Close" will pulse the relay to trigger your opener.

> **NOTE:** This plugin currently runs in simulation mode for door state detection. For better safety, add magnetic sensors and extend the code.

## Testing GPIO Manually

Before using with Homebridge, test your GPIO setup manually:

```bash
# Test GPIO 17 (kernel 529)
echo 529 > /sys/class/gpio/export
echo out > /sys/class/gpio/gpio529/direction
echo 1 > /sys/class/gpio/gpio529/value  # Turn relay on
sleep 2
echo 0 > /sys/class/gpio/gpio529/value  # Turn relay off
echo 529 > /sys/class/gpio/unexport
```

## Extend with Door Sensors

Connect a reed switch or sensor to another GPIO (e.g. GPIO18) and update the code to read it in `handleCurrentDoorStateGet`.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | "Garage Door" | Name of the accessory in HomeKit |
| `gpioPin` | number | 17 | GPIO pin number (user-friendly, not kernel) |
| `pulseDuration` | number | 1000 | How long to pulse the relay in milliseconds |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
