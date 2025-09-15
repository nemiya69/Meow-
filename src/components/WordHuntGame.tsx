import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

// The words to find (exactly as specified)
const WORDS = ['meow', 'unreal', 'perchance', 'baby', 'I love you', 'strawberries', 'waffles'];

const GRID_SIZE = 12;

interface Cell {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
  isFound: boolean;
  wordId?: number;
}

interface WordPosition {
  word: string;
  cells: Array<{ row: number; col: number }>;
  direction: string;
}

const WordHuntGame: React.FC = () => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [wordsLeft, setWordsLeft] = useState(WORDS.length);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [gameWon, setGameWon] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(5);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Array<{ row: number; col: number }>>([]);
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([]);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate random letter
  const getRandomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

  // Check if position is valid
  const isValidPosition = (row: number, col: number) => 
    row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;

  // Get direction vectors
  const directions = [
    { dr: 0, dc: 1, name: 'horizontal' },      // right
    { dr: 0, dc: -1, name: 'horizontal-rev' }, // left
    { dr: 1, dc: 0, name: 'vertical' },        // down
    { dr: -1, dc: 0, name: 'vertical-rev' },   // up
    { dr: 1, dc: 1, name: 'diagonal' },        // down-right
    { dr: -1, dc: -1, name: 'diagonal-rev' },  // up-left
    { dr: 1, dc: -1, name: 'anti-diagonal' },  // down-left
    { dr: -1, dc: 1, name: 'anti-diagonal-rev' } // up-right
  ];

  // Try to place a word in the grid
  const tryPlaceWord = (word: string, grid: string[][], positions: WordPosition[]): boolean => {
    const cleanWord = word.replace(/\s/g, '').toUpperCase();
    const attempts = 100;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const startRow = Math.floor(Math.random() * GRID_SIZE);
      const startCol = Math.floor(Math.random() * GRID_SIZE);

      // Check if word fits
      let canPlace = true;
      const wordCells: Array<{ row: number; col: number }> = [];

      for (let i = 0; i < cleanWord.length; i++) {
        const row = startRow + i * direction.dr;
        const col = startCol + i * direction.dc;

        if (!isValidPosition(row, col)) {
          canPlace = false;
          break;
        }

        wordCells.push({ row, col });

        // Check if cell is empty or matches the letter we want to place
        if (grid[row][col] !== '' && grid[row][col] !== cleanWord[i]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        // Place the word
        for (let i = 0; i < cleanWord.length; i++) {
          const { row, col } = wordCells[i];
          grid[row][col] = cleanWord[i];
        }

        positions.push({
          word: word,
          cells: wordCells,
          direction: direction.name
        });

        return true;
      }
    }

    return false;
  };

  // Initialize the game grid
  const initializeGame = useCallback(() => {
    const newGrid: string[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    const positions: WordPosition[] = [];

    // Try to place all words
    const wordsToPlace = [...WORDS];
    for (const word of wordsToPlace) {
      if (!tryPlaceWord(word, newGrid, positions)) {
        console.warn(`Could not place word: ${word}`);
      }
    }

    // Fill empty cells with random letters
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (newGrid[row][col] === '') {
          newGrid[row][col] = getRandomLetter();
        }
      }
    }

    // Convert to Cell objects
    const cellGrid: Cell[][] = newGrid.map((row, rowIndex) =>
      row.map((letter, colIndex) => ({
        letter,
        row: rowIndex,
        col: colIndex,
        isSelected: false,
        isFound: false
      }))
    );

    setGrid(cellGrid);
    setWordPositions(positions);
    setWordsLeft(WORDS.length);
    setFoundWords(new Set());
  }, []);

  // Check if selected cells form a valid word
  const checkForWord = useCallback((cells: Array<{ row: number; col: number }>) => {
    if (cells.length < 2) return null;

    // Get the letters from selected cells
    const letters = cells.map(cell => grid[cell.row][cell.col].letter).join('');
    const reversedLetters = letters.split('').reverse().join('');

    // Check against all words
    for (const position of wordPositions) {
      const wordLetters = position.word.replace(/\s/g, '').toUpperCase();
      
      if (letters === wordLetters || reversedLetters === wordLetters) {
        // Check if the selected cells match the word position
        const positionCells = position.cells.map(c => `${c.row}-${c.col}`).sort();
        const selectedCellIds = cells.map(c => `${c.row}-${c.col}`).sort();
        
        if (positionCells.join(',') === selectedCellIds.join(',')) {
          return position.word;
        }
      }
    }

    return null;
  }, [grid, wordPositions]);

  // Handle word found
  const handleWordFound = useCallback((word: string, cells: Array<{ row: number; col: number }>) => {
    if (foundWords.has(word)) return;

    setFoundWords(prev => new Set([...prev, word]));
    setWordsLeft(prev => prev - 1);

    // Mark cells as found
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      cells.forEach(({ row, col }) => {
        newGrid[row][col].isFound = true;
      });
      return newGrid;
    });

    // Check if game is won
    if (foundWords.size + 1 === WORDS.length) {
      setTimeout(() => setGameWon(true), 500);
    }
  }, [foundWords]);

  // Handle mouse/touch events
  const handleCellMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    setSelectedCells([{ row, col }]);
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(r => r.map(c => ({ ...c, isSelected: false })));
      newGrid[row][col].isSelected = true;
      return newGrid;
    });
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting) return;

    setSelectedCells(prev => {
      if (prev.length === 0) return [{ row, col }];
      
      const start = prev[0];
      const newCells = getLineCells(start.row, start.col, row, col);
      
      setGrid(prevGrid => {
        const newGrid = prevGrid.map(r => r.map(c => ({ ...c, isSelected: false })));
        newCells.forEach(({ row: r, col: c }) => {
          if (isValidPosition(r, c)) {
            newGrid[r][c].isSelected = true;
          }
        });
        return newGrid;
      });
      
      return newCells;
    });
  };

  const handleCellMouseUp = () => {
    if (!isSelecting) return;
    
    const word = checkForWord(selectedCells);
    if (word) {
      handleWordFound(word, selectedCells);
    }

    setIsSelecting(false);
    setGrid(prevGrid => 
      prevGrid.map(row => 
        row.map(cell => ({ ...cell, isSelected: false }))
      )
    );
    setSelectedCells([]);
  };

  // Get cells in a line between two points
  const getLineCells = (startRow: number, startCol: number, endRow: number, endCol: number) => {
    const cells: Array<{ row: number; col: number }> = [];
    
    const deltaRow = endRow - startRow;
    const deltaCol = endCol - startCol;
    
    // Check if it's a valid line (horizontal, vertical, or diagonal)
    if (deltaRow !== 0 && deltaCol !== 0 && Math.abs(deltaRow) !== Math.abs(deltaCol)) {
      return [{ row: startRow, col: startCol }];
    }
    
    const steps = Math.max(Math.abs(deltaRow), Math.abs(deltaCol));
    
    for (let i = 0; i <= steps; i++) {
      const row = startRow + Math.round((deltaRow * i) / steps);
      const col = startCol + Math.round((deltaCol * i) / steps);
      cells.push({ row, col });
    }
    
    return cells;
  };

  // Start countdown
  const startCountdown = () => {
    setShowCountdown(true);
    let count = 5;
    const interval = setInterval(() => {
      count--;
      setCountdownNumber(count);
      if (count === 0) {
        clearInterval(interval);
        setShowCountdown(false);
        setShowFinalMessage(true);
      }
    }, 1000);
  };

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  if (showFinalMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-4 p-8 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg">
            <h1 className="font-romantic text-6xl text-love mb-6">💖</h1>
            <div className="space-y-4 text-lg leading-relaxed font-sweet">
              <p>
                Happy birthday my sweet sweet baby, texting you that one night was the most important decision I ever made. 
                I feel really blessed everyday waking up to your texts and knowing you're in my life.
              </p>
              <p>
                You're my everything and you're really strong considering everything you've been through, 
                and I'm really really proud of you for that.
              </p>
              <p>
                Never ever stop being strong and never ever change anything, my baby. 
                I love you so much and you're so perfect.
              </p>
              <p className="font-romantic text-2xl text-heart">
                Happy birthday again... I can't wait for all the birthdays we'll share together 💖
              </p>
            </div>
          </div>
          <div className="flex justify-center space-x-4">
            <span className="text-4xl animate-bounce">💕</span>
            <span className="text-4xl animate-bounce delay-100">🎂</span>
            <span className="text-4xl animate-bounce delay-200">🎉</span>
          </div>
        </div>
      </div>
    );
  }

  if (showCountdown) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl font-bold text-heart countdown-number">
            {countdownNumber}
          </div>
          <div className="flex justify-center space-x-2 mt-8">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-2xl animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                💖
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gameWon) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="font-romantic text-6xl text-heart">🎉</h1>
            <h2 className="font-sweet text-3xl text-love">
              Congrats my baby ur so smart u won ❤️
            </h2>
          </div>
          <Button 
            onClick={startCountdown}
            className="btn-romantic text-xl px-8 py-4"
          >
            Next
          </Button>
          <div className="flex justify-center space-x-4">
            {[...Array(7)].map((_, i) => (
              <span key={i} className="text-3xl float-hearts" style={{ animationDelay: `${i * 0.3}s` }}>
                💕
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center space-y-6">
      <div className="text-center space-y-4">
        <h1 className="font-romantic text-5xl md:text-7xl text-heart">
          Birthday Word Hunt 💖
        </h1>
        <p className="font-sweet text-lg text-muted-foreground">
          Find all the hidden words in the puzzle. The counter will tell you how many are left. 
          When you find them all, a surprise awaits...
        </p>
        <div className="font-sweet text-xl text-love">
          Words left: <span className="font-bold text-heart">{wordsLeft}</span>
        </div>
      </div>

      <div 
        ref={gridRef}
        className="word-grid select-none"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        onMouseLeave={handleCellMouseUp}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`grid-cell ${cell.isSelected ? 'selected' : ''} ${cell.isFound ? 'found' : ''}`}
              onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
              onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
              onMouseUp={handleCellMouseUp}
              onTouchStart={() => handleCellMouseDown(rowIndex, colIndex)}
              onTouchEnd={handleCellMouseUp}
            >
              {cell.letter}
            </div>
          ))
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="font-sweet text-sm text-muted-foreground">
          Drag to select letters and find the hidden words!
        </p>
      </div>
    </div>
  );
};

export default WordHuntGame;