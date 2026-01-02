// Game board rendering
export class GameBoard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.rows = [];
    this.currentRow = 0;
    this.currentTile = 0;
    this.init();
  }

  init() {
    this.container.innerHTML = '';
    this.rows = [];

    for (let i = 0; i < 6; i++) {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.row = i;

      const tiles = [];
      for (let j = 0; j < 5; j++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.row = i;
        tile.dataset.col = j;
        row.appendChild(tile);
        tiles.push(tile);
      }

      this.container.appendChild(row);
      this.rows.push({ element: row, tiles });
    }

    this.currentRow = 0;
    this.currentTile = 0;
  }

  // Add a letter to current position
  addLetter(letter) {
    if (this.currentTile >= 5) return false;

    const tile = this.rows[this.currentRow].tiles[this.currentTile];
    tile.textContent = letter;
    tile.classList.add('filled');
    this.currentTile++;
    return true;
  }

  // Remove the last letter
  removeLetter() {
    if (this.currentTile <= 0) return false;

    this.currentTile--;
    const tile = this.rows[this.currentRow].tiles[this.currentTile];
    tile.textContent = '';
    tile.classList.remove('filled');
    return true;
  }

  // Clear all letters from current row
  clearCurrentRow() {
    const tiles = this.rows[this.currentRow].tiles;
    tiles.forEach(tile => {
      tile.textContent = '';
      tile.classList.remove('filled');
    });
    this.currentTile = 0;
  }

  // Get current input as string
  getCurrentWord() {
    return this.rows[this.currentRow].tiles
      .map(tile => tile.textContent)
      .join('');
  }

  // Set the current row's letters (for syncing)
  setCurrentLetters(letters) {
    const tiles = this.rows[this.currentRow].tiles;

    for (let i = 0; i < 5; i++) {
      if (i < letters.length) {
        tiles[i].textContent = letters[i];
        tiles[i].classList.add('filled');
      } else {
        tiles[i].textContent = '';
        tiles[i].classList.remove('filled');
      }
    }

    this.currentTile = letters.length;
  }

  // Reveal colors with animation
  revealRow(row, colors, callback) {
    const tiles = this.rows[row].tiles;

    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.classList.add('flip');

        setTimeout(() => {
          tile.classList.add(colors[i]);

          if (i === 4 && callback) {
            setTimeout(callback, 250);
          }
        }, 250);
      }, i * 300);
    });
  }

  // Shake row for invalid word
  shakeRow(row = this.currentRow) {
    const rowElement = this.rows[row].element;
    rowElement.classList.add('shake');
    setTimeout(() => rowElement.classList.remove('shake'), 300);
  }

  // Bounce row for win
  bounceRow(row) {
    const tiles = this.rows[row].tiles;
    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.classList.add('bounce');
      }, i * 100);
    });
  }

  // Move to next row
  nextRow() {
    this.currentRow++;
    this.currentTile = 0;
  }

  // Reset the board
  reset() {
    this.init();
  }
}
