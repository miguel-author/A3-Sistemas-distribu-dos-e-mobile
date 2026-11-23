"use strict";

// Guarda as regras e o estado da sessão, independentemente da interface.
class GameModel {
  constructor() {
    this.winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    this.resetScores();
  }

  newRound() {
    this.board = Array(9).fill(null);
    this.currentPlayer = "X";
    this.result = null;
    this.winningCells = [];
  }

  resetScores() {
    this.scores = { X: 0, O: 0, draw: 0 };
    this.newRound();
  }

  play(index) {
    if (this.result) return "finished";
    if (!Number.isInteger(index) || index < 0 || index >= this.board.length) {
      return "invalid";
    }
    if (this.board[index] !== null) return "occupied";

    const player = this.currentPlayer;
    this.board[index] = player;
    const line = this.winningLines.find(
      (positions) => positions.every((position) => this.board[position] === player)
    );

    // A última casa pode completar uma trinca. Nesse caso, a vitória tem prioridade.
    if (line) {
      this.result = player;
      this.winningCells = line;
    } else if (this.board.every((cell) => cell !== null)) {
      this.result = "draw";
    } else {
      this.currentPlayer = player === "X" ? "O" : "X";
    }

    if (this.result) this.scores[this.result] += 1;
    return "played";
  }

  getState() {
    return {
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      result: this.result,
      winningCells: [...this.winningCells],
      scores: { ...this.scores }
    };
  }
}

// Atualiza os elementos da página e expõe as interações ao controlador.
class GameView {
  constructor(root) {
    this.cells = [...root.querySelectorAll("#board .cell")];
    this.status = root.querySelector("#status");
    this.banner = root.querySelector(".turn-banner");
    this.settingsButton = root.querySelector("#settings");
    this.settingsDialog = root.querySelector("#settings-dialog");
    this.reduceGlow = root.querySelector("#reduce-glow");
    this.page = root.body;
    this.scores = {
      X: root.querySelector("#score-x"),
      O: root.querySelector("#score-o"),
      draw: root.querySelector("#score-draw")
    };
    this.newRoundButton = root.querySelector("#new-round");
    this.resetButton = root.querySelector("#reset-scores");
  }

  bindActions({ play, newRound, resetScores }) {
    this.cells.forEach((cell, index) => {
      cell.addEventListener("click", () => play(index));
    });
    this.newRoundButton.addEventListener("click", newRound);
    this.resetButton.addEventListener("click", resetScores);
    this.settingsButton.addEventListener("click", () => this.settingsDialog.showModal());
    this.settingsDialog.addEventListener("close", () => this.settingsButton.focus());
    this.reduceGlow.addEventListener("change", () => {
      this.page.classList.toggle("reduced-glow", this.reduceGlow.checked);
    });
  }

  confirmReset() {
    return window.confirm("Zerar o placar e iniciar uma nova partida?");
  }

  render({ board, scores, winningCells, result, currentPlayer }, occupied = false) {
    const focusedCell = this.cells.includes(document.activeElement);
    this.cells.forEach((button, index) => {
      const mark = board[index];
      const wins = winningCells.includes(index);
      const row = Math.floor(index / 3) + 1;
      const column = index % 3 + 1;
      button.textContent = mark ?? "";
      button.classList.toggle("mark-x", mark === "X");
      button.classList.toggle("mark-o", mark === "O");
      button.classList.toggle("winning", wins);
      button.disabled = result !== null;
      button.setAttribute("aria-label",
        `Linha ${row}, coluna ${column}: ${mark ?? "vazia"}${wins ? ", casa vencedora" : ""}`);
    });

    for (const key of Object.keys(this.scores)) {
      this.scores[key].textContent = scores[key];
    }

    let message = `Vez do Jogador ${currentPlayer}`;
    if (occupied) message = `Casa ocupada! ${message}`;
    if (result === "draw") message = "Partida empatada!";
    else if (result) message = `Jogador ${result} venceu!`;
    this.banner.dataset.tone = occupied ? "warning" : (result ?? currentPlayer);
    this.status.textContent = message;

    // Mantém a navegação por teclado quando a casa ativa é desabilitada.
    if (result && focusedCell) this.newRoundButton.focus();
  }

  focusBoard() {
    this.cells[0].focus();
  }
}

// Encaminha as ações da interface ao modelo e apresenta o novo estado.
class GameController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.view.bindActions({
      play: (index) => this.play(index),
      newRound: () => this.newRound(),
      resetScores: () => this.resetScores()
    });
    this.view.render(this.model.getState());
  }

  play(index) {
    const outcome = this.model.play(index);
    if (outcome === "played" || outcome === "occupied") {
      this.view.render(this.model.getState(), outcome === "occupied");
    }
  }

  newRound() {
    this.model.newRound();
    this.showNewRound();
  }

  resetScores() {
    if (this.view.confirmReset()) {
      this.model.resetScores();
      this.showNewRound();
    }
  }

  showNewRound() {
    this.view.render(this.model.getState());
    this.view.focusBoard();
  }
}

new GameController(new GameModel(), new GameView(document));
