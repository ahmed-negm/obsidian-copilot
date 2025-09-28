import { App, SuggestModal } from "obsidian";

export class ChoiceSuggestModal extends SuggestModal<string> {
  private resolve!: () => void;
  private messageEl?: HTMLElement;
  choice: string = "";

  private constructor(
    app: App,
    message: string,
    private choices: string[],
    private location: "top" | "bottom",
    private blurBack: boolean = false
  ) {
    super(app);
    this.setPlaceholder(message);

    // Apply custom placeholder color styling to the input element
    setTimeout(() => {
      const inputEl = this.inputEl;
      if (inputEl) {
        // Using CSS custom property for placeholder color
        inputEl.style.setProperty("--placeholder-color", "rgb(203, 77, 73)"); // Change to your desired color
        inputEl.style.setProperty("color", "rgb(203, 77, 73)"); // Set the text color as well
        inputEl.style.fontSize = "22px"; // Set font size to 22px

        // Apply placeholder styles for different browsers
        const styleEl = document.createElement("style");
        styleEl.textContent = `
          .prompt-input::placeholder {
            color: var(--placeholder-color) !important;
            opacity: 1;
            font-size: 22px;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }, 0);
  }

  static async open(
    app: App,
    message: string,
    choices: string[],
    location: "top" | "bottom",
    blurBack: boolean = false
  ) {
    const modal = new ChoiceSuggestModal(app, message, choices, location, blurBack);

    await modal.openAndWait();

    return modal.choice;
  }

  /**
   * Show the modal and return a Promise that resolves with the user's choice.
   */
  openAndWait(): Promise<void> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  getSuggestions(_query: string): string[] {
    return this.choices;
  }

  renderSuggestion(choice: string, el: HTMLElement) {
    // Add the suggestion-item class to each suggestion for consistent styling
    el.addClass("suggestion-item");
    el.createEl("div", {
      text: choice,
      attr: {
        style: "direction: rtl; padding: 8px 0; font-size: 18px;",
      },
    });
  }

  onOpen() {
    super.onOpen();
    if (this.blurBack) {
      this.addBlurToAppContainer();
    }

    // Add CSS animation styles
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes slide-up {
        from {
          opacity: 0;
          transform: translateY(30px) translateX(-50%);
        }
        to {
          opacity: 1;
          transform: translateY(0) translateX(-50%);
        }
      }

      .suggestion-item {
        padding: 10px;
        direction: rtl;
        font-size: 18px;
      }
    `;
    document.head.appendChild(styleEl);

    // Position the modal at the bottom of the screen
    if (this.modalEl) {
      // Ensure modal is above the blur overlay
      this.modalEl.style.zIndex = "10000";
      // Set position to absolute and position at the bottom
      this.modalEl.style.direction = "rtl";
      this.modalEl.style.position = "absolute";
      this.modalEl.style.bottom = this.location === "bottom" ? "50px" : "unset";
      this.modalEl.style.top = this.location === "top" ? "50px" : "unset";
      this.modalEl.style.maxHeight = "50vh"; // Limit height to 50% of viewport height
      this.modalEl.style.width = "50%"; // Set width to 50% of the screen
      this.modalEl.style.left = "50%"; // Center horizontally
      this.modalEl.style.transform = "translateX(-50%)"; // Center align
      this.modalEl.style.animation = "slide-up 0.3s ease-out forwards";
      this.modalEl.style.borderRadius = "12px"; // Rounded corners
    }

    // Add a message element above the input
    this.messageEl = this.contentEl.createDiv({
      cls: "modal-message",
      attr: {
        style:
          "text-align: center; margin-bottom: 15px; font-weight: bold; color: rgb(203, 77, 73); direction: rtl;",
      },
    });

    if (this.messageEl) {
      this.messageEl.textContent = this.inputEl.placeholder;
    }
  }

  onChooseSuggestion(choice: string) {
    this.choice = choice;
    this.close();
  }

  onClose() {
    if (this.blurBack) {
      this.removeBlurFromAppContainer();
    }
    super.onClose();

    this.resolve();
  }

  /**
   * Adds a blur effect to the main app container (background only).
   */
  private addBlurToAppContainer() {
    // Inject CSS if not already present
    if (!document.getElementById("copilot-blur-bg-style")) {
      const style = document.createElement("style");
      style.id = "copilot-blur-bg-style";
      style.textContent = `.copilot-blur-bg { filter: blur(8px) !important; transition: filter 0.2s; }`;
      document.head.appendChild(style);
    }
    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.classList.add("copilot-blur-bg");
  }

  /**
   * Removes the blur effect from the main app container.
   */
  private removeBlurFromAppContainer() {
    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.classList.remove("copilot-blur-bg");
  }
}
