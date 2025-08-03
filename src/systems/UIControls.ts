import { AppConfig } from "../config/AppConfig";

export interface SliderConfig {
  id: string;
  valueId: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
}

export interface SliderCallback {
  (value: number): void;
}

export class UIControls {
  private sliders: Map<string, { element: HTMLInputElement; valueElement: HTMLSpanElement; callback?: SliderCallback }> = new Map();

  /**
   * Creates and sets up a slider with its value display
   */
  createSlider(config: SliderConfig, callback?: SliderCallback): void {
    const slider = document.getElementById(config.id) as HTMLInputElement;
    const valueElement = document.getElementById(config.valueId) as HTMLSpanElement;

    if (!slider || !valueElement) {
      console.warn(`Slider elements not found: ${config.id} or ${config.valueId}`);
      return;
    }

    // Set slider properties
    if (config.min !== undefined) slider.min = config.min.toString();
    if (config.max !== undefined) slider.max = config.max.toString();
    if (config.step !== undefined) slider.step = config.step.toString();
    
    // Set initial value
    slider.value = config.defaultValue.toString();
    this.updateDisplay(valueElement, config.defaultValue, config.precision);

    // Store reference
    this.sliders.set(config.id, { element: slider, valueElement, callback });

    // Add event listener
    slider.addEventListener("input", (event) => {
      const value = this.parseValue((event.target as HTMLInputElement).value, config.precision);
      this.updateDisplay(valueElement, value, config.precision);
      
      if (callback) {
        callback(value);
      }
    });
  }

  /**
   * Updates a slider's value and display
   */
  updateSlider(id: string, value: number, precision?: number): void {
    const sliderData = this.sliders.get(id);
    if (!sliderData) {
      console.warn(`Slider not found: ${id}`);
      return;
    }

    sliderData.element.value = value.toString();
    this.updateDisplay(sliderData.valueElement, value, precision);
  }

  /**
   * Gets the current value of a slider
   */
  getSliderValue(id: string): number {
    const sliderData = this.sliders.get(id);
    if (!sliderData) {
      console.warn(`Slider not found: ${id}`);
      return 0;
    }

    return parseFloat(sliderData.element.value);
  }

  /**
   * Updates the display element with the given value
   */
  private updateDisplay(element: HTMLSpanElement, value: number, precision?: number): void {
    if (precision !== undefined) {
      element.textContent = value.toFixed(precision);
    } else {
      element.textContent = value.toString();
    }
  }

  /**
   * Parses a string value to number with optional precision
   */
  private parseValue(value: string, precision?: number): number {
    const numValue = parseFloat(value);
    if (precision !== undefined) {
      return parseFloat(numValue.toFixed(precision));
    }
    return numValue;
  }

  /**
   * Creates a rotation slider with degree display
   */
  createRotationSlider(config: SliderConfig, callback?: SliderCallback): void {
    const slider = document.getElementById(config.id) as HTMLInputElement;
    const valueElement = document.getElementById(config.valueId) as HTMLSpanElement;
    const degreesElement = document.getElementById("rotation-degrees") as HTMLSpanElement;

    if (!slider || !valueElement || !degreesElement) {
      console.warn(`Rotation slider elements not found: ${config.id}, ${config.valueId}, or rotation-degrees`);
      return;
    }

    // Set slider properties
    if (config.min !== undefined) slider.min = config.min.toString();
    if (config.max !== undefined) slider.max = config.max.toString();
    if (config.step !== undefined) slider.step = config.step.toString();
    
    // Set initial value
    slider.value = config.defaultValue.toString();
    this.updateRotationDisplay(valueElement, degreesElement, config.defaultValue, config.precision);

    // Store reference
    this.sliders.set(config.id, { element: slider, valueElement, callback });

    // Add event listener
    slider.addEventListener("input", (event) => {
      const value = this.parseValue((event.target as HTMLInputElement).value, config.precision);
      this.updateRotationDisplay(valueElement, degreesElement, value, config.precision);
      
      if (callback) {
        callback(value);
      }
    });
  }

  /**
   * Updates rotation display with both value and degrees
   */
  private updateRotationDisplay(valueElement: HTMLSpanElement, degreesElement: HTMLSpanElement, value: number, precision?: number): void {
    if (precision !== undefined) {
      valueElement.textContent = value.toFixed(precision);
    } else {
      valueElement.textContent = value.toString();
    }
    degreesElement.textContent = Math.round((value * 180) / Math.PI) + "°";
  }

  /**
   * Creates a star size slider that updates both min and max values
   */
  createStarSizeSlider(minConfig: SliderConfig, maxConfig: SliderConfig, callback: (minSize: number, maxSize: number) => void): void {
    const minSlider = document.getElementById(minConfig.id) as HTMLInputElement;
    const minValueElement = document.getElementById(minConfig.valueId) as HTMLSpanElement;
    const maxSlider = document.getElementById(maxConfig.id) as HTMLInputElement;
    const maxValueElement = document.getElementById(maxConfig.valueId) as HTMLSpanElement;

    if (!minSlider || !minValueElement || !maxSlider || !maxValueElement) {
      console.warn(`Star size slider elements not found`);
      return;
    }

    // Set initial values
    minSlider.value = minConfig.defaultValue.toString();
    maxSlider.value = maxConfig.defaultValue.toString();
    this.updateDisplay(minValueElement, minConfig.defaultValue, minConfig.precision);
    this.updateDisplay(maxValueElement, maxConfig.defaultValue, maxConfig.precision);

    // Store references
    this.sliders.set(minConfig.id, { element: minSlider, valueElement: minValueElement });
    this.sliders.set(maxConfig.id, { element: maxSlider, valueElement: maxValueElement });

    // Add event listeners
    const updateStarSizes = () => {
      const minSize = parseInt(minSlider.value);
      const maxSize = parseInt(maxSlider.value);
      callback(minSize, maxSize);
    };

    minSlider.addEventListener("input", (event) => {
      const value = parseInt((event.target as HTMLInputElement).value);
      this.updateDisplay(minValueElement, value);
      updateStarSizes();
    });

    maxSlider.addEventListener("input", (event) => {
      const value = parseInt((event.target as HTMLInputElement).value);
      this.updateDisplay(maxValueElement, value);
      updateStarSizes();
    });
  }
}