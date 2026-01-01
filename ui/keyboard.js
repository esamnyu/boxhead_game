// On-screen keyboard
export class Keyboard {
  constructor(containerId, onKeyPress) {
    this.container = document.getElementById(containerId);
    this.onKeyPress = onKeyPress;
    this.keys = {};
    this.init();
    this.bindPhysicalKeyboard();
  }

  init() {
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
    ];

    this.container.innerHTML = '';

    rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';

      row.forEach(key => {
        const keyEl = document.createElement('button');
        keyEl.className = 'key';
        keyEl.textContent = key === 'BACK' ? '⌫' : key;
        keyEl.dataset.key = key;

        if (key === 'ENTER' || key === 'BACK') {
          keyEl.classList.add('wide');
        }

        keyEl.addEventListener('click', () => this.handleKey(key));
        rowEl.appendChild(keyEl);

        if (key.length === 1) {
          this.keys[key] = keyEl;
        }
      });

      this.container.appendChild(rowEl);
    });
  }

  bindPhysicalKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();

      if (key === 'ENTER') {
        this.handleKey('ENTER');
      } else if (key === 'BACKSPACE') {
        this.handleKey('BACK');
      } else if (/^[A-Z]$/.test(key)) {
        this.handleKey(key);
      }
    });
  }

  handleKey(key) {
    if (this.onKeyPress) {
      this.onKeyPress(key);
    }
  }

  // Update key colors based on game state
  updateKeyStates(keyStates) {
    for (const [letter, state] of Object.entries(keyStates)) {
      const keyEl = this.keys[letter];
      if (keyEl) {
        // Remove existing state classes
        keyEl.classList.remove('correct', 'present', 'absent');
        // Add new state class
        keyEl.classList.add(state);
      }
    }
  }

  // Reset all key colors
  reset() {
    for (const keyEl of Object.values(this.keys)) {
      keyEl.classList.remove('correct', 'present', 'absent');
    }
  }
}
