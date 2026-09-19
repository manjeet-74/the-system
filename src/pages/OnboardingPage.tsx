import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

interface Riddle {
  question: string;
  answers: string[];
}

const RIDDLES: Riddle[] = [
  {
    question: "What gets wetter the more it dries?",
    answers: ["towel", "a towel"],
  },
  {
    question: "What has keys but can't open locks?",
    answers: ["piano", "a piano", "keyboard"],
  },
  {
    question: "The more of this there is, the less you see. What is it?",
    answers: ["darkness", "dark"],
  },
  {
    question: "What can fill a room but takes up no space?",
    answers: ["light", "the light"],
  },
];

const PLEDGE_TEXT = "I ACCEPT THE SYSTEM. I WILL NOT FALTER.";
const TIMER_SECONDS = 45;

export function OnboardingPage() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [usernameInput, setUsernameInput] = useState(
    user?.user_metadata?.user_name || user?.email?.split('@')[0] || 'Hunter'
  );

  // Stage 2 state
  const [riddleIndex, setRiddleIndex] = useState(0);
  const [riddleInput, setRiddleInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [riddleError, setRiddleError] = useState('');

  // Stage 3 state
  const [pledgeInput, setPledgeInput] = useState('');
  const [pledgeError, setPledgeError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already passed
  useEffect(() => {
    if (profile?.courage_test_passed) {
      navigate('/', { replace: true });
    }
  }, [profile, navigate]);

  // Timer for Stage 2
  useEffect(() => {
    if (step !== 2) return;

    setTimeLeft(TIMER_SECONDS);
    setRiddleError('');

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleRiddleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, riddleIndex]);

  const handleRiddleTimeout = () => {
    setRiddleError('TIME EXPIRED. THE SYSTEM REJECTS WEAKNESS. RETRY WITH A NEW TRIAL.');
    setRiddleInput('');
    // Pick another random riddle index
    setRiddleIndex((prev) => (prev + 1) % RIDDLES.length);
  };

  const handleRiddleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentRiddle = RIDDLES[riddleIndex];
    const normalizedInput = riddleInput.trim().toLowerCase();

    if (currentRiddle.answers.includes(normalizedInput)) {
      setRiddleError('');
      setStep(3);
    } else {
      setRiddleError('INCORRECT ANSWER. THE SYSTEM DEMANDS ABSOLUTE PRECISION. RETRYING.');
      setRiddleInput('');
      setRiddleIndex((prev) => (prev + 1) % RIDDLES.length);
      setTimeLeft(TIMER_SECONDS);
    }
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pledgeInput.trim() !== PLEDGE_TEXT) {
      setPledgeError('PLEDGE MISMATCH. YOU MUST TYPE THE PLEDGE EXACTLY AS SHOWN.');
      return;
    }

    try {
      setSubmitting(true);
      await updateProfile({
        username: usernameInput.trim() || 'Hunter',
        courage_test_passed: true,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      setPledgeError(err.message || 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] flex items-center justify-center p-4">
      <div className="bg-[#0a0f1c] border border-[#3fd6f5]/30 p-8 rounded-lg max-w-lg w-full shadow-[0_0_30px_rgba(63,214,245,0.15)] relative overflow-hidden">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded transition-colors duration-300 ${
                s <= step ? 'bg-[#3fd6f5]' : 'bg-[#6d81a0]/30'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Designation */}
        {step === 1 && (
          <div>
            <h1 className="font-rajdhani text-3xl font-bold text-[#3fd6f5] mb-2 tracking-wide">
              STAGE I: DESIGNATION
            </h1>
            <p className="text-[#6d81a0] text-sm mb-6">
              Enter your designated Hunter codename to proceed into THE SYSTEM.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (usernameInput.trim()) setStep(2);
              }}
            >
              <label className="block font-rajdhani text-sm font-semibold text-[#6d81a0] mb-2">
                HUNTER CODENAME
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#04070d] border border-[#3fd6f5]/40 text-[#e6f1f7] rounded px-4 py-3 mb-6 focus:outline-none focus:border-[#3fd6f5] focus:ring-1 focus:ring-[#3fd6f5] font-rajdhani font-semibold text-lg"
                placeholder="Enter codename..."
                required
              />

              <button
                type="submit"
                className="w-full bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-lg py-3 rounded hover:bg-[#3fd6f5]/90 transition-all cursor-pointer"
              >
                PROCEED TO TRIAL →
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Trial of Courage */}
        {step === 2 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h1 className="font-rajdhani text-3xl font-bold text-[#3fd6f5] tracking-wide">
                STAGE II: TRIAL OF COURAGE
              </h1>
              <div
                className={`font-rajdhani font-bold text-xl px-3 py-1 rounded border ${
                  timeLeft <= 10
                    ? 'border-[#ff4d5e] text-[#ff4d5e] animate-ping'
                    : 'border-[#3fd6f5]/40 text-[#3fd6f5]'
                }`}
              >
                {timeLeft}s
              </div>
            </div>

            <p className="text-[#6d81a0] text-sm mb-6">
              Solve the system anomaly before the timer expires. Absolute focus required.
            </p>

            {riddleError && (
              <div className="bg-[#ff4d5e]/10 border border-[#ff4d5e] text-[#ff4d5e] p-3 rounded mb-4 text-xs font-semibold">
                {riddleError}
              </div>
            )}

            <div className="bg-[#04070d] border border-[#3fd6f5]/20 p-4 rounded mb-6">
              <span className="font-rajdhani text-xs text-[#3fd6f5] font-bold block mb-1">
                SYSTEM ANOMALY #{riddleIndex + 1}
              </span>
              <p className="text-lg font-rajdhani text-[#e6f1f7]">
                "{RIDDLES[riddleIndex].question}"
              </p>
            </div>

            <form onSubmit={handleRiddleSubmit}>
              <input
                type="text"
                value={riddleInput}
                onChange={(e) => setRiddleInput(e.target.value)}
                className="w-full bg-[#04070d] border border-[#3fd6f5]/40 text-[#e6f1f7] rounded px-4 py-3 mb-6 focus:outline-none focus:border-[#3fd6f5] focus:ring-1 focus:ring-[#3fd6f5] font-rajdhani font-semibold text-lg"
                placeholder="Type your answer..."
                autoFocus
                required
              />

              <button
                type="submit"
                className="w-full bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-lg py-3 rounded hover:bg-[#3fd6f5]/90 transition-all cursor-pointer"
              >
                SUBMIT SOLUTION →
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: System Pledge */}
        {step === 3 && (
          <div>
            <h1 className="font-rajdhani text-3xl font-bold text-[#3fd6f5] mb-2 tracking-wide">
              STAGE III: SYSTEM PLEDGE
            </h1>
            <p className="text-[#6d81a0] text-sm mb-6">
              Type the exact covenant text below to bind your profile to THE SYSTEM.
            </p>

            {pledgeError && (
              <div className="bg-[#ff4d5e]/10 border border-[#ff4d5e] text-[#ff4d5e] p-3 rounded mb-4 text-xs font-semibold">
                {pledgeError}
              </div>
            )}

            <div className="bg-[#04070d] border border-[#3fd6f5]/40 p-4 rounded mb-6 text-center select-none">
              <span className="font-rajdhani text-xs text-[#6d81a0] block mb-1">
                REQUIRED PLEDGE
              </span>
              <p className="font-rajdhani font-bold text-lg text-[#3fd6f5] tracking-widest">
                {PLEDGE_TEXT}
              </p>
            </div>

            <form onSubmit={handlePledgeSubmit}>
              <input
                type="text"
                value={pledgeInput}
                onChange={(e) => {
                  setPledgeInput(e.target.value);
                  setPledgeError('');
                }}
                className="w-full bg-[#04070d] border border-[#3fd6f5]/40 text-[#e6f1f7] rounded px-4 py-3 mb-6 focus:outline-none focus:border-[#3fd6f5] focus:ring-1 focus:ring-[#3fd6f5] font-rajdhani font-semibold text-base tracking-wider"
                placeholder="Type pledge exactly..."
                autoFocus
                required
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-lg py-3 rounded hover:bg-[#3fd6f5]/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'BINDING PROFILE...' : 'ACCEPT COVENANT & ENTER SYSTEM'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
