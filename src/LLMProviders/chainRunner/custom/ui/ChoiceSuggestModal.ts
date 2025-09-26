import { App, SuggestModal } from "obsidian";

/**
 * Modal dialog for presenting choices to the user
 */
export class ChoiceSuggestModal extends SuggestModal<string> {
  private resolve!: (choice: string) => void;
  private messageEl?: HTMLElement;

  /**
   * Create a new ChoiceSuggestModal
   * @param app The Obsidian App instance
   * @param message The message/prompt to display
   * @param choices Array of choices to present to the user
   */
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
}
