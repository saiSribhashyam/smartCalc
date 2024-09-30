import React, { useEffect, useRef, useState } from 'react';
import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { Eraser, Paintbrush, RotateCcw, Play, History, X, Menu } from 'lucide-react';

const SWATCHES = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string | number;
  assign: boolean;
}

interface HistoryItem {
  results: GeneratedResult[];
  timestamp: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('rgb(255, 255, 255)');
  const [brushSize, setBrushSize] = useState(3);
  const [selectedColor, setSelectedColor] = useState('rgb(255, 255, 255)');
  const [dictOfVars, setDictOfVars] = useState<Record<string, number>>({});
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);

  // Function to prevent default scrolling
  const preventDefault = (e: TouchEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        ctx.lineCap = 'round';
        ctx.lineWidth = brushSize;
      }
    }

    const savedHistory = localStorage.getItem('calculatorHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.MathJax) {
        window.MathJax.Hub.Config({
          tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
        });
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
      }
    };

    // Add event listener to prevent default scrolling on mobile
    document.body.addEventListener('touchmove', preventDefault, { passive: false });

    // Clean up event listener and script
    return () => {
      document.body.removeEventListener('touchmove', preventDefault);
      document.head.removeChild(script);
    };
  }, [brushSize]);

  useEffect(() => {
    if (results.length > 0) {
      renderMathJax();
    }
  }, [results]);

  const renderMathJax = () => {
    if (window.MathJax) {
      window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
    }
  };

  const startDrawing = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      let x, y;
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
      }
    }
  };

  const draw = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      let x, y;
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = brushSize;
        if (isEraser) {
          ctx.strokeStyle = 'rgb(0, 0, 0)';
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.strokeStyle = color;
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();

        // Undo redo feature
        const newState = canvas.toDataURL();
        const historySlice = canvasHistory.slice(0, currentStep + 1);
        setCanvasHistory([...historySlice, newState]);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Undo redo feature
        const blankState = canvas.toDataURL();
        setCanvasHistory([blankState]);
        setCurrentStep(0);
      }
    }
    setResults([]);
    setDictOfVars({});
  };

  const undo = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.src = canvasHistory[currentStep - 1];
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
        }
      }
    }
  };

  const redo = () => {
    if (currentStep < canvasHistory.length - 1) {
      setCurrentStep(currentStep + 1);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.src = canvasHistory[currentStep + 1];
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
        }
      }
    }
  };

  const runRoute = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate/`, {
          image: canvas.toDataURL('image/png'),
          dict_of_vars: dictOfVars,
        });

        const resp = response.data;
        console.log('Response', resp);
        const newResults: GeneratedResult[] = [];
        resp.data.forEach((data: Response) => {
          if (data.assign === true) {
            setDictOfVars((prevDict) => ({
              ...prevDict,
              [data.expr]: Number(data.result),
            }));
          }
          newResults.push({
            expression: data.expr,
            answer: String(data.result),
          });
        });
        setResults(newResults);

        const newHistoryItem: HistoryItem = {
          results: newResults,
          timestamp: Date.now(),
        };
        const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
        setHistory(updatedHistory);
        localStorage.setItem('calculatorHistory', JSON.stringify(updatedHistory));
      } catch (error) {
        console.error('Error running calculation:', error);
        // You might want to handle the error more gracefully here
      }
    }
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const toggleNavbar = () => {
    setShowNavbar(!showNavbar);
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden touch-none">
      <nav className="bg-black p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-xl font-bold">Mad Coder's Drawing Calc</h1>
          <Button onClick={toggleNavbar} className="md:hidden">
            <Menu size={24} color="white" />
          </Button>
        </div>
      </nav>

      <div className={`bg-black p-4 ${showNavbar ? 'block' : 'hidden'} md:block`}>
        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
          <Button
            onClick={resetCanvas}
            className="flex items-center justify-center text-white bg-red-500 hover:bg-red-600"
            variant="default"
          >
            <RotateCcw className="mr-2" size={16} />
            Reset
          </Button>

          <Button
            onClick={undo}
            className="flex items-center justify-center text-white bg-blue-500 hover:bg-blue-600"
            variant="default"
            disabled={currentStep === 0}
          >
            {/* <Undo className="mr-2" size={16} /> */}
            Undo
          </Button>

          <Button
            onClick={redo}
            className="flex items-center justify-center text-white bg-blue-500 hover:bg-blue-600"
            variant="default"
            disabled={currentStep === canvasHistory.length - 1}
          >
            {/* <Redo className="mr-2" size={16} /> */}
            Redo
          </Button>

          <div className="flex items-center bg-gray-200 rounded-md px-3 py-2">
            <Paintbrush className="mr-2" size={16} />
            <input
              id="brush-size"
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full"
            />
            <span className="ml-2 font-bold">{brushSize}</span>
          </div>

          <Group className="flex justify-center">
            {SWATCHES.map((swatch) => (
              <ColorSwatch
                key={swatch}
                color={swatch}
                onClick={() => {
                  setColor(swatch);
                  setSelectedColor(swatch);
                  setIsEraser(false);
                }}
                style={{
                  cursor: 'pointer',
                  border:
                    selectedColor === swatch && !isEraser
                      ? '2px solid white'
                      : '1px solid gray',
                  transform:
                    selectedColor === swatch && !isEraser ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out',
                }}
              />
            ))}
          </Group>

          <Button
            onClick={() => setIsEraser(!isEraser)}
            className={`flex items-center justify-center ${
              isEraser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            } hover:bg-blue-600`}
            variant="default"
          >
            <Eraser className="mr-2" size={16} />
            Eraser
          </Button>

          <Button
            onClick={runRoute}
            className="flex items-center justify-center text-white bg-green-500 hover:bg-green-600"
            variant="default"
          >
            <Play className="mr-2" size={16} />
            Run
          </Button>

          <Button
            onClick={toggleHistory}
            className="flex items-center justify-center text-white bg-purple-500 hover:bg-purple-600"
            variant="default"
          >
            <History className="mr-2" size={16} />
            History
          </Button>
        </div>
      </div>

      <div className="flex-grow relative">
        <canvas
          ref={canvasRef}
          id="canvas"
          className="w-full h-full bg-black"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {results.length > 0 && (
          <div className="absolute top-4 right-4 bg-white bg-opacity-75 p-2 rounded shadow-md max-w-full overflow-x-auto">
            <div id="mathResults">
              {results.map((result, index) => (
                <div key={index}>
                  {`\\(\\LARGE{${result.expression} = ${result.answer}}\\)`}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={`fixed top-0 right-0 h-full w-full md:w-80 bg-white bg-opacity-90 p-4 shadow-lg transition-transform duration-300 ease-in-out ${
            showHistory ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">History</h3>
            <Button
              onClick={toggleHistory}
              className="p-1 rounded-full hover:bg-gray-200"
              variant="ghost"
            >
              <X size={20} />
            </Button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-2rem)]">
            {history.map((item, index) => (
              <div key={index} className="mb-4 border-b pb-2">
                <p className="text-sm text-gray-500">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
                {item.results.map((result, idx) => (
                  <div key={idx}>
                    {`\\(\\normalsize{${result.expression} = ${result.answer}}\\)`}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
