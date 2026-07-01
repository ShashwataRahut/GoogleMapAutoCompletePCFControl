# Google Maps Autocomplete Fluent UI PCF Control

Google Maps Autocomplete Fluent UI PCF Control is a free, open-source Power Apps Component Framework (PCF) control that lets you add a Google Places autocomplete input field—styled with Fluent UI Web Components—directly to your model-driven app.

## Features

- Integrates Google Maps Places API for address suggestions
- Built with Fluent UI Web Components (`fluent-text-field`)
- Outputs individual address components (street, city, state, postal code, country) and geolocation (latitude, longitude)
- Optional country restriction and placeholder configuration
- Simple drop-in replacement for standard text inputs

## How to Use

1. **Import the solution**  
   Build the solution using the provided NPM scripts (see _Build and Deploy_) and import the generated `.zip` file into your Power Apps environment.
2. **Add the control to a form**  
   In Power Apps Studio, open the form where you want the control and add **Google Maps Autocomplete Fluent UI PCF Control** to a text field.
3. **Configure properties**
   - `apiKey` – **required** Google Maps API key (Places API enabled)
   - `placeholder` – optional placeholder text
   - `countryRestriction` – optional comma-separated list of ISO 3166-1 alpha-2 country codes (e.g. `US,CA`)
4. **Publish and test**  
   Save, publish, and play the app. Start typing an address and select a suggestion; the control will populate the bound field and expose the parsed components.

### Output Bindings

| Property     | Description                               |
| ------------ | ----------------------------------------- |
| `address`    | Full formatted address (bound)            |
| `street`     | Street name + number                      |
| `city`       | City / locality                           |
| `state`      | State / administrative area               |
| `postalCode` | Postal / ZIP code                         |
| `country`    | Country                                   |
| `latitude`   | Latitude of the selected place (decimal)  |
| `longitude`  | Longitude of the selected place (decimal) |

## Privacy

The text you type in the control is sent directly from the client browser to Google Maps servers to retrieve autocomplete suggestions and place details. No data is collected or stored by Liminity AB or this component.

## Documentation

- [Google Places API Autocomplete](https://developers.google.com/maps/documentation/javascript/places-autocomplete)
- [Power Apps Component Framework](https://learn.microsoft.com/power-apps/developer/component-framework/overview)

## Build and Deploy

```bash
npm install
npm run build             # Build the control
npm run build:solution     # Create managed/unmanaged solution bundles
```

Import the generated solution (`*.zip` in `out/solution`) into your Power Apps environment and add the control to your app.

## Contributing

We welcome contributions! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature or fix branch
3. Commit your changes with a clear message
4. Push the branch and open a pull request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

## About

Google Maps Autocomplete Fluent UI PCF Control is developed and maintained by [Liminity AB](https://liminity.se).
