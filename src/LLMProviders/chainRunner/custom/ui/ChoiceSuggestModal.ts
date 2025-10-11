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

    setTimeout(() => {
      const inputEl = this.inputEl;
      if (inputEl) {
        inputEl.style.setProperty("--placeholder-color", "rgb(203, 77, 73)");
        inputEl.style.setProperty("color", "rgb(203, 77, 73)");
        inputEl.style.fontSize = "22px";

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

    if (this.modalEl) {
      this.modalEl.style.zIndex = "10000";
      this.modalEl.style.direction = "rtl";
      this.modalEl.style.position = "absolute";
      this.modalEl.style.bottom = this.location === "bottom" ? "50px" : "unset";
      this.modalEl.style.top = this.location === "top" ? "50px" : "unset";
      this.modalEl.style.maxHeight = "50vh";
      this.modalEl.style.width = "50%";
      this.modalEl.style.left = "50%";
      this.modalEl.style.transform = "translateX(-50%)";
      this.modalEl.style.animation = "slide-up 0.3s ease-out forwards";
      this.modalEl.style.borderRadius = "12px";
    }

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

  private addBlurToAppContainer() {
    if (!document.getElementById("copilot-blur-bg-style")) {
      const style = document.createElement("style");
      style.id = "copilot-blur-bg-style";
      style.textContent = `.copilot-blur-bg { filter: blur(8px) !important; transition: filter 0.2s; }`;
      document.head.appendChild(style);
    }
    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.classList.add("copilot-blur-bg");
  }

  private removeBlurFromAppContainer() {
    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.classList.remove("copilot-blur-bg");
  }
}
