import { IInputs, IOutputs } from "./generated/ManifestTypes";
// Remove unused Fluent UI React imports
// import { TextField, ITextFieldStyles } from "@fluentui/react/lib/TextField";
// import { initializeIcons } from '@fluentui/font-icons-mdl2';
// Import Fluent UI Web Components
import {
  provideFluentDesignSystem,
  fluentTextField,
} from "@fluentui/web-components";

// Declare types for Google Maps without using namespace
type Autocomplete = google.maps.places.Autocomplete;
type AutocompleteOptions = google.maps.places.AutocompleteOptions;
type GeocoderAddressComponent = google.maps.GeocoderAddressComponent;

export class GoogleAddressAutocomplete
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private _container: HTMLDivElement;
  private _context: ComponentFramework.Context<IInputs>;
  private _notifyOutputChanged: () => void;
  private _autocomplete: Autocomplete | null = null;
  private _value: string = "";
  // Reference to the <fluent-text-field> custom element
  private _fluentInput: HTMLElement;
  // Reference to the actual <input> inside the shadow DOM
  private _innerInputElement: HTMLInputElement | null = null;

  /**
   * Empty constructor.
   */
  constructor() {}

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this._context = context;
    this._container = container;
    this._notifyOutputChanged = notifyOutputChanged;

    // Initialize Fluent UI icons - Not needed for Fluent UI Web Components
    // initializeIcons();

    // Register Fluent UI Web Components
    provideFluentDesignSystem().register(fluentTextField());

    this._value = context.parameters.address.raw || "";
    // Create FluentTextField
    this._fluentInput = document.createElement("fluent-text-field");
    this._fluentInput.setAttribute(
      "placeholder",
      context.parameters.placeholder?.raw || "Enter an address"
    );
    this._fluentInput.style.width = "100%";
    // Set initial value via attribute, framework might handle property setting
    this._fluentInput.setAttribute("value", this._value);

    // Append the FluentTextField
    this._container.appendChild(this._fluentInput);

    // Add event listener for input changes (will bubble from inner input)
    this._fluentInput.addEventListener("input", this.onFluentInputChange);

    this.loadGoogleMapsScript();
  }

  // Handler for FluentTextField input changes
  private onFluentInputChange = (event: Event): void => {
    // The target of the input event should be the inner input element
    const target = event.target as HTMLInputElement;
    if (target) {
      this._value = target.value;
    }
    // We only notify output changes when a place is selected by Google Autocomplete
    // this._notifyOutputChanged();
  };

  private loadGoogleMapsScript(): void {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this._context.parameters.apiKey.raw}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => this.initAutocomplete();
    document.head.appendChild(script);
  }

  private initAutocomplete(): void {
    // Use requestAnimationFrame to wait for the component to render its shadow DOM
    requestAnimationFrame(() => {
      if (!this._fluentInput || !this._fluentInput.shadowRoot) {
        console.error("Fluent text field or its shadowRoot not found.");
        // Optionally retry or handle error
        return;
      }
      this._innerInputElement =
        this._fluentInput.shadowRoot.querySelector("input");

      if (!this._innerInputElement) {
        console.error(
          "Inner input element not found within fluent-text-field shadow DOM."
        );
        return;
      }

      const options: AutocompleteOptions = {
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["address"],
      };

      if (this._context.parameters.countryRestriction?.raw) {
        options.componentRestrictions = {
          country: this._context.parameters.countryRestriction.raw
            .split(",")
            .map((c) => c.trim()),
        };
      }

      // ***** Initialize Autocomplete with the INNER input element *****
      this._autocomplete = new google.maps.places.Autocomplete(
        this._innerInputElement,
        options
      );
      this._autocomplete.addListener("place_changed", () =>
        this.handlePlaceChanged()
      );

      // Ensure the inner input's value is synchronized
      this._innerInputElement.value = this._value;
    });
  }

  private handlePlaceChanged(): void {
    // Ensure the inner input element is available
    if (this._autocomplete && this._innerInputElement) {
      const place = this._autocomplete.getPlace();

      if (place.formatted_address) {
        // Update the value of the INNER input element
        this._innerInputElement.value = place.formatted_address;
        this._value = place.formatted_address; // Keep internal state consistent
      }

      if (place.address_components) {
        this._context.parameters.address.raw = place.formatted_address || "";

        const streetNumber = this.getAddressComponent(place, "street_number");
        const route = this.getAddressComponent(place, "route");
        // Expose the house/street number as its own bound output so it can be
        // mapped to a dedicated D365 field.
        this._context.parameters.houseNumber.raw = streetNumber;
        // Street now holds only the street name (route); the number is exposed
        // separately via houseNumber above.
        this._context.parameters.street.raw = route.trim();

        this._context.parameters.city.raw =
          this.getAddressComponent(place, "locality") ||
          this.getAddressComponent(place, "postal_town") ||
          this.getAddressComponent(place, "administrative_area_level_2");

        this._context.parameters.state.raw = this.getAddressComponent(
          place,
          "administrative_area_level_1"
        );
        this._context.parameters.postalCode.raw = this.getAddressComponent(
          place,
          "postal_code"
        );
        this._context.parameters.country.raw = this.getAddressComponent(
          place,
          "country"
        );
        // ISO 3166-1 alpha-2 code (e.g. "IN", "FR") comes from the component's
        // short_name; the full country name comes from long_name above.
        this._context.parameters.countryCode.raw = this.getAddressComponent(
          place,
          "country",
          true
        );

        // Update latitude and longitude handling
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          console.log("Latitude:", lat, "Longitude:", lng); // Debug log

          this._context.parameters.latitude.raw = lat;
          this._context.parameters.longitude.raw = lng;
        } else {
          console.log("No geometry data available"); // Debug log
          this._context.parameters.latitude.raw = null;
          this._context.parameters.longitude.raw = null;
        }

        this._notifyOutputChanged();
      }
    }
  }

  // Helper method to get address components
  private getAddressComponent(
    place: google.maps.places.PlaceResult,
    type: string,
    useShortName = false
  ): string {
    const component = place.address_components?.find((component) =>
      component.types.includes(type)
    );
    if (!component) {
      return "";
    }
    return useShortName ? component.short_name : component.long_name;
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._context = context;
    this._value = context.parameters.address.raw || "";

    // Update the inner input's value if it's initialized
    if (this._innerInputElement) {
      this._innerInputElement.value = this._value;
    }
    // It might also be necessary to update the attribute on the host element
    // if the component relies on it for internal state updates
    this._fluentInput.setAttribute("value", this._value);
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
   */
  public getOutputs(): IOutputs {
    // Return the latest value stored in the internal state
    return {
      address: this._value,
      houseNumber: this._context.parameters.houseNumber.raw || "",
      street: this._context.parameters.street.raw || "",
      city: this._context.parameters.city.raw || "",
      state: this._context.parameters.state.raw || "",
      postalCode: this._context.parameters.postalCode.raw || "",
      country: this._context.parameters.country.raw || "",
      countryCode: this._context.parameters.countryCode.raw || "",
      latitude:
        this._context.parameters.latitude.raw !== null
          ? this._context.parameters.latitude.raw
          : undefined,
      longitude:
        this._context.parameters.longitude.raw !== null
          ? this._context.parameters.longitude.raw
          : undefined,
    };
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Remove the event listener from FluentTextField
    this._fluentInput.removeEventListener("input", this.onFluentInputChange);

    // Remove the Google Maps script
    const script = document.querySelector(
      'script[src^="https://maps.googleapis.com/maps/api/js"]'
    );
    if (script) {
      script.remove();
    }

    // Remove the autocomplete listener if it exists
    if (this._autocomplete) {
      google.maps.event.clearInstanceListeners(this._autocomplete);
    }
  }
}
