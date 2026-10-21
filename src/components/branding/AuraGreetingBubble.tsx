import { useEffect, useState } from "react";
import { auraGreetings } from "../../data/auraGreetings";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { LoadingIndicator } from "../ui/LoadingIndicator";

type GreetingFrame = {
  index: number;
  characters: number;
  phase: "thinking" | "typing" | "holding";
};

const initialFrame: GreetingFrame = {
  index: 0,
  characters: 0,
  phase: "thinking",
};

const pause = (minimum: number, variation: number) =>
  minimum + Math.floor(Math.random() * variation);

type GreetingMessage = { greeting: string; message: string };

interface AuraGreetingBubbleProps {
  messages?: readonly [GreetingMessage, ...GreetingMessage[]];
  repeat?: boolean;
  randomOrder?: boolean;
  className?: string;
  headingId?: string;
}

export function AuraGreetingBubble({
  messages = auraGreetings,
  repeat = true,
  randomOrder = false,
  className = "",
  headingId,
}: AuraGreetingBubbleProps = {}) {
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState(initialFrame);

  useEffect(() => {
    if (reducedMotion) return;
    let current = initialFrame;
    let timer: number | undefined;
    let dueAt = 0;
    let remaining = 1200;

    function schedule(delay: number) {
      remaining = delay;
      dueAt = Date.now() + delay;
      if (!document.hidden) timer = window.setTimeout(advance, delay);
    }

    function advance() {
      const item = messages[current.index];
      if (!repeat && current.phase === "holding") return;
      const text = item.greeting + item.message;
      let delay: number;
      if (current.phase === "holding") {
        current = {
          index:
            (current.index + 1 +
              (randomOrder && messages.length > 1
                ? Math.floor(Math.random() * (messages.length - 1))
                : 0)) % messages.length,
          characters: 0,
          phase: "thinking",
        };
        delay = pause(1100, 900);
      } else if (current.phase === "thinking") {
        current = { ...current, phase: "typing", characters: 1 };
        delay = pause(30, 35);
      } else {
        const characters = current.characters + 1;
        const finished = characters >= text.length;
        current = {
          ...current,
          characters,
          phase: finished ? "holding" : "typing",
        };
        // Leave each complete message readable; every other one gets a longer rest.
        delay = finished
          ? pause(current.index % 2 === 0 ? 8000 : 14000, 4000)
          : /[.!?,]/.test(text[characters - 1])
            ? pause(230, 180)
            : pause(30, 35);
      }
      setFrame(current);
      if (repeat || current.phase !== "holding") schedule(delay);
    }

    function visibilityChanged() {
      if (!repeat && current.phase === "holding") return;
      if (document.hidden) {
        remaining = Math.max(0, dueAt - Date.now());
        window.clearTimeout(timer);
      } else {
        schedule(remaining);
      }
    }

    schedule(remaining);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [reducedMotion, messages, repeat, randomOrder]);

  const item = messages[reducedMotion ? 0 : frame.index];
  const characters = reducedMotion
    ? item.greeting.length + item.message.length
    : frame.characters;
  const thinking = !reducedMotion && frame.phase === "thinking";
  const typing = !reducedMotion && frame.phase === "typing";
  const greetingComplete = characters >= item.greeting.length;

  return (
    <div
      className={`auth-speech-bubble ${className}`}
      role="group"
      aria-label={headingId ? undefined : "AuRA welcome"}
      aria-labelledby={headingId}
      data-phase={reducedMotion ? "holding" : frame.phase}
    >
      {headingId ? (
        <h1 id={headingId} className="sr-only">{messages[0].greeting}</h1>
      ) : (
        <span className="sr-only">
          {messages[0].greeting} {messages[0].message}
        </span>
      )}
      {/* Reserve the tallest message so typing never moves the robot. */}
      {messages.map((message) => (
        <div
          className="auth-speech-reserve"
          aria-hidden="true"
          key={message.greeting}
        >
          <p className="auth-speech-greeting">{message.greeting}</p>
          {message.message && <p>{message.message}</p>}
        </div>
      ))}
      <div className="auth-speech-content" aria-hidden="true">
        {thinking ? (
          <LoadingIndicator />
        ) : (
          <>
            <p
              className={`auth-speech-greeting${typing && !greetingComplete ? " auth-speech-cursor" : ""}`}
            >
              {item.greeting.slice(0, characters)}
            </p>
            {item.message && (
              <p
                className={typing && greetingComplete ? "auth-speech-cursor" : undefined}
              >
                {item.message.slice(0, Math.max(0, characters - item.greeting.length))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
