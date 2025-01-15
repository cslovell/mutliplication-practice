'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import ReactConfetti from 'react-confetti';


interface PerformanceData {
  [key: string]: {
    times: number[];
    average: number;
    count: number;
    wrongAnswers: number
  };
}

interface StatsData {
  problem: string;
  averageTime: string;
  attempts: number;
}

interface AnimatedEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

type GameStatus = 'waiting' | 'playing';


const MultiplicationGame: React.FC = () => {
  const [num1, setNum1] = useState<number>(2);
  const [num2, setNum2] = useState<number>(2);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [focusNumber, setFocusNumber] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({});
  const [showStats, setShowStats] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  // const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatedEmojis, setAnimatedEmojis] = useState<AnimatedEmoji[]>([]);


  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);

  // Add these new state variables after the existing useState declarations
  const [problemQueue, setProblemQueue] = useState<Array<[number, number]>>([]);
  const [isUsingPerformanceData, setIsUsingPerformanceData] = useState<boolean>(false);


  const handleStartGame = () => {
    console.log('Starting game...');
    setGameStatus('playing');
  };

  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      if (pauseStartTime && questionStartTime) {
        // Adjust question start time to account for pause duration
        const pauseDuration = Date.now() - pauseStartTime;
        setQuestionStartTime(questionStartTime + pauseDuration);
        setPauseStartTime(null);
      }
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
      if (gameStatus === 'playing') {
        setPauseStartTime(Date.now());
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameStatus, pauseStartTime, questionStartTime]);

  useEffect(() => {
    console.log('Current game status:', gameStatus); // Debug logging
  }, [gameStatus]);

  useEffect(() => {
    if (gameStatus === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameStatus]);

  useEffect(() => {
    setIsWindowFocused(document.hasFocus());

    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEnterKey();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus]);


  const handleEnterKey = () => {
    if (gameStatus === 'waiting') {
      console.log('Starting game...');
      setGameStatus('playing');
    }
  };

  // Add this function to generate a random queue
  const generateRandomQueue = () => {
    const numbers = Array.from({ length: 11 }, (_, i) => i + 2);
    const shuffled = [...numbers].sort(() => Math.random() - 0.5);

    if (focusNumber === null) {
      const queue: Array<[number, number]> = [];
      for (const n1 of shuffled) {
        for (const n2 of shuffled) {
          queue.push([n1, n2]);
        }
      }
      return queue.sort(() => Math.random() - 0.5);
    }

    return shuffled.map(n => [focusNumber, n] as [number, number]);
  };

  // Modify the generatePerformanceQueue function
  const generatePerformanceQueue = () => {
    const pairs = Object.entries(performanceData)
      .filter(([key]) => {
        // Only include pairs that start with the focus number when in focus mode
        if (focusNumber) {
          return key.startsWith(`${focusNumber}x`);
        }
        return true;
      })
      .map(([key, data]) => {
        const [n1, n2] = key.split('x').map(Number);
        return {
          pair: [n1, n2] as [number, number],
          avgTime: data.average,
          wrongAnswers: data.wrongAnswers,
          weight: Math.min(5, Math.ceil(data.average / 2) + Math.min(2, data.wrongAnswers))
        };
      });

    // Rest of the function remains the same...
    pairs.sort((a, b) => {
      const scoreA = b.avgTime + (b.wrongAnswers * 2);
      const scoreB = a.avgTime + (a.wrongAnswers * 2);
      return scoreA - scoreB;
    });

    const queue: Array<[number, number]> = [];
    pairs.forEach(({ pair, weight }) => {
      for (let i = 0; i < weight; i++) {
        queue.push(pair);
      }
    });

    return queue.sort(() => Math.random() - 0.5);
  };


  const updatePerformanceData = (multiplicand: number, multiplier: number, timeSpent: number, isCorrect: boolean) => {
    setPerformanceData(prev => {
      const key = `${multiplicand}x${multiplier}`;
      const existing = prev[key] || {
        times: [],
        average: 0,
        count: 0,
        wrongAnswers: 0
      };
      const times = [...existing.times, timeSpent];
      const average = times.reduce((a, b) => a + b, 0) / times.length;

      return {
        ...prev,
        [key]: {
          times,
          average,
          count: existing.count + 1,
          wrongAnswers: existing.wrongAnswers + (isCorrect ? 0 : 1)
        }
      };
    });
  };

  const triggerReward = () => {
    // Show confetti
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);

    // Add floating emojis
    const emojis = ['🌟', '⭐', '🎉', '🎈', '🎊', '👏', '🌈'];
    const newEmoji: AnimatedEmoji = {
      id: Date.now(),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 80 + 10, // Random position 10-90%
      y: 50 // Start at middle
    };
    setAnimatedEmojis(prev => [...prev, newEmoji]);

    // Remove emoji after animation
    setTimeout(() => {
      setAnimatedEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 1000);
  };


  // Modify the generateNewProblem function
  const generateNewProblem = () => {
    if (problemQueue.length === 0) {
      // If queue is empty, generate new queue
      const newQueue = isUsingPerformanceData && Object.keys(performanceData).length > 0
        ? generatePerformanceQueue()
        : generateRandomQueue();

      setProblemQueue(newQueue);
      setIsUsingPerformanceData(!isUsingPerformanceData);

      // Use first problem from new queue
      const [newNum1, newNum2] = newQueue[0];
      setProblemQueue(newQueue.slice(1));
      setNum1(newNum1);
      setNum2(newNum2);
    } else {
      // Use next problem from existing queue
      const [newNum1, newNum2] = problemQueue[0];
      setProblemQueue(problemQueue.slice(1));
      setNum1(newNum1);
      setNum2(newNum2);
    }

    setUserAnswer('');
    setShowAnswer(false);
    setFeedback('');
    setQuestionStartTime(Date.now());
  };

  const checkAnswer = () => {
    if (questionStartTime === null) return;

    const timeSpent = (Date.now() - questionStartTime) / 1000;
    const correctAnswer = num1 * num2;
    const userNum = parseInt(userAnswer);
    const isCorrect = userNum === correctAnswer;

    updatePerformanceData(num1, num2, timeSpent, isCorrect);
    ;

    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);
      setFeedback('Correct! 🌟');
      triggerReward();
      setTimeout(generateNewProblem, 20);
    } else {
      setStreak(0);
      setFeedback('Try again! You can do it!');
      setShowAnswer(false);
    }
  };

  // Modify the handleTableSelect function
  const handleTableSelect = (number: number) => {
    if (number === focusNumber) {
      setFocusNumber(null);
      setScore(0);
      setStreak(0);
      setFeedback('');
      setProblemQueue([]);
      setIsUsingPerformanceData(false);
      return;
    }

    setFocusNumber(number);
    setScore(0);
    setStreak(0);
    setFeedback('');
    setProblemQueue([]);
    setIsUsingPerformanceData(false);
    if (gameStatus === 'playing') {
      // Reset the queue and generate a new problem with the new focus number
      const newQueue = generateRandomQueue();
      setProblemQueue(newQueue.slice(1));
      const [newNum1, newNum2] = newQueue[0];
      setNum1(newNum1);
      setNum2(newNum2);
      setUserAnswer('');
      setShowAnswer(false);
      setFeedback('');
      setQuestionStartTime(Date.now());
    }
  };

  const emojiStyle = (emoji: AnimatedEmoji) => ({
    position: 'fixed' as const,
    left: `${emoji.x}%`,
    top: `${emoji.y}%`,
    animation: 'float-up 1s ease-out',
    fontSize: '2rem',
    pointerEvents: 'none' as const,
  });

  const getStatsData = (): StatsData[] => {
    if (!focusNumber) return [];

    return Array.from({ length: 11 }, (_, i) => {
      const multiplicand = focusNumber;
      const multiplier = i + 2;
      const key = `${multiplicand}x${multiplier}`;
      const data = performanceData[key] || { average: 0, count: 0 };

      return {
        problem: `${multiplicand}×${multiplier}`,
        averageTime: data.average ? data.average.toFixed(1) : "0.0",
        attempts: data.count
      };
    });
  };

  useEffect(() => {
    if (gameStatus === 'playing') {
      const newQueue = generateRandomQueue();
      if (newQueue.length > 0) {
        setProblemQueue(newQueue.slice(1));
        const [newNum1, newNum2] = newQueue[0];
        setNum1(newNum1);
        setNum2(newNum2);
        setUserAnswer('');
        setShowAnswer(false);
        setFeedback('');
        setQuestionStartTime(Date.now());
      }
    }
  }, [gameStatus, focusNumber]);

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold mb-2">John Lovell&apos;s  Multiplication Practice</div>
          <div className="flex justify-center items-center gap-2">
            <span className="text-lg score">Score: {score}</span>
            {/* <div className="flex items-center ml-4">
              {[...Array(streak)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div> */}
          </div>
        </div>

        <>
          {showConfetti && <ReactConfetti
            recycle={false}
            numberOfPieces={streak > 5 ? 500 : 200}
            gravity={0.3}
          />}
          {animatedEmojis.map(emoji => (
            <div
              key={emoji.id}
              className="floating-emoji"
              style={emojiStyle(emoji)}
            >
              {emoji.emoji}
            </div>
          ))}
        </>

        <div className="mb-6">
          <div className="text-center mb-2 text-gray-600">Select a table to practice:</div>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <Button
                key={num}
                onClick={() => handleTableSelect(num)}
                variant={focusNumber === num ? "default" : "outline"}
                className={`w-12 h-12`}
              >
                {num}
              </Button>
            ))}
          </div>
          <div className="text-center text-sm text-gray-500">
            {focusNumber
              ? `Practicing ${focusNumber}-times tables`
              : 'Random practice mode'}
          </div>
        </div>

        <div className="text-center mb-8">
          {!isWindowFocused ? (
            <div className="text-xl text-orange-500 mb-4">
              Click here to focus the window first!
            </div>
          ) : gameStatus === 'waiting' ? (
            <div>
              <div className="text-xl text-green-500 mb-4">
                Press Enter or tap Start to begin!
              </div>
              <Button
                onClick={handleStartGame}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-xl"
              >
                Start Game
              </Button>
            </div>
          ) : (
            <>
              <div className="text-4xl font-bold mb-4">
                {num1} × {num2} = ?
              </div>
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={userAnswer}
                onChange={(e) => {
                  // Only allow numbers
                  if (/^\d*$/.test(e.target.value)) {
                    setUserAnswer(e.target.value);
                  }
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    checkAnswer();
                  }
                }}
                className="w-24 text-center text-2xl p-2 border rounded 
    [appearance:textfield] 
    [&::-webkit-outer-spin-button]:appearance-none 
    [&::-webkit-inner-spin-button]:appearance-none
    bg-gray-50 
    focus:bg-white 
    focus:ring-2 
    focus:ring-blue-500 
    focus:outline-none"                placeholder="?"
                maxLength={5}
                min="0"
                max="99999"
              />
            </>
          )}
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={checkAnswer}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6"
          >
            Check Answer
          </Button>
          <Button
            onClick={generateNewProblem}
            variant="outline"
          >
            New Problem
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="text-lg font-medium text-blue-600 feedback">{feedback}</div>
          {showAnswer && (
            <div className="text-gray-600 mt-2">
              The answer is {num1 * num2}
            </div>
          )}
        </div>

        {focusNumber && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Performance Statistics</h3>
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="outline"
                className="text-sm"
              >
                {showStats ? 'Hide Stats' : 'Show Stats'}
              </Button>
            </div>

            {showStats && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getStatsData()} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="problem" />
                    <YAxis
                      label={{ value: 'Average Time (seconds)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="averageTime"
                      fill="#3b82f6"
                      name="Avg. Time (s)"
                    >
                      {/* Add attempt count labels on top of bars */}
                      {getStatsData().map((entry, index) => (
                        <LabelList
                          key={index}
                          dataKey="attempts"
                          position="top"
                          content={({ x, y, value }) => {
                            if (typeof x === 'undefined' || typeof y === 'undefined') return null;
                            return (
                              <text
                                x={x}
                                y={y}
                                dy={-10}
                                fill="#666"
                                textAnchor="middle"
                                fontSize={12}
                              >
                                {value}
                              </text>
                            );
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiplicationGame;
