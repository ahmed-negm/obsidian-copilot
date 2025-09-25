import { App, SuggestModal } from "obsidian";

export class ChoiceSuggestModal extends SuggestModal<string> {
  private resolve!: (choice: string) => void;
  private messageEl?: HTMLElement;

  constructor(
    app: App,
    message: string,
    private choices: string[]
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

  /**
   * Show the modal and return a Promise that resolves with the user's choice.
   */
  openAndWait(): Promise<string> {
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

  onChooseSuggestion(choice: string) {
    this.resolve(choice);
    this.close();
  }

  onOpen() {
    super.onOpen();

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
      // Set position to absolute and position at the bottom
      this.modalEl.style.direction = "rtl";
      this.modalEl.style.position = "absolute";
      this.modalEl.style.bottom = "20px";
      this.modalEl.style.top = "unset"; // Clear the top position
      this.modalEl.style.maxHeight = "50vh"; // Limit height to 50% of viewport height
      this.modalEl.style.width = "80%"; // Make it wider
      this.modalEl.style.maxWidth = "600px"; // But not too wide

      // Center horizontally
      this.modalEl.style.left = "50%";
      this.modalEl.style.transform = "translateX(-50%)";

      // Add some animation
      this.modalEl.style.animation = "slide-up 0.3s ease";

      // Add a drop shadow for better visibility
      this.modalEl.style.boxShadow = "0 -5px 20px rgba(0, 0, 0, 0.1)";

      // Ensure the suggestion container is properly styled too
      const suggestionContainer = this.modalEl.querySelector(".suggestion-container");
      if (suggestionContainer) {
        (suggestionContainer as HTMLElement).style.maxHeight = "40vh";
        (suggestionContainer as HTMLElement).style.overflowY = "auto";
      }
    }
  }

  onClose() {
    if (this.messageEl) {
      this.messageEl.remove();
    }
    super.onClose();
  }
}
