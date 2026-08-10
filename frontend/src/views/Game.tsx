"use client";

// Import de next
import Image from "next/image";

// Import de react
import { useState, useEffect, useRef } from "react";

import { motion } from "framer-motion";

// Import des composants
import Section from "../components/Section";

// Import du contexte
import { useGame } from "../context/GameContext";

export default function Game() {
    const { toPlay, time, volume } = useGame();
    const [turn, setTurn] = useState<number>(1);
    const [phase, setPhase] = useState<"guessing" | "answer" | "transition">("guessing");
    const [timeLeft, setTimeLeft] = useState<number>(time);
    const [artistGuess, setArtistGuess] = useState<string>("");
    const [trackGuess, setTrackGuess] = useState<string>("");

    const audioRef = useRef<HTMLAudioElement>(null);
    const volumeRef = useRef(volume);

    useEffect(() => {
        volumeRef.current = volume;
    }, [volume]);

    // Sync volume when setting changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Handle track autoplay, reload, and crescendo on new turn
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0; // Start at 0 for crescendo
            audioRef.current.load();
            audioRef.current.play().catch(() => { });

            // Crescendo (fade-in) over 2 seconds
            const targetVolume = volumeRef.current;
            const duration = 2000; // 2s
            const tickRate = 50; // ms per step
            const steps = duration / tickRate;
            let currentStep = 0;

            const crescendoInterval = setInterval(() => {
                currentStep++;
                if (audioRef.current) {
                    const currentVol = (currentStep / steps) * targetVolume;
                    audioRef.current.volume = Math.min(targetVolume, currentVol);
                }
                if (currentStep >= steps) {
                    clearInterval(crescendoInterval);
                }
            }, tickRate);

            return () => clearInterval(crescendoInterval);
        }
    }, [turn]);

    // Enable play after user interaction
    useEffect(() => {
        const handleInteraction = () => {
            if (audioRef.current?.paused) {
                audioRef.current.play().catch(() => { });
            }
            document.removeEventListener("click", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        return () => document.removeEventListener("click", handleInteraction);
    }, []);

    useEffect(() => {
        setTimeLeft(time);
    }, [time]);

    // Countdown timer ticks down every second
    useEffect(() => {
        if (timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft]);

    // State machine transitions when timer hits 0
    useEffect(() => {
        if (timeLeft <= 0) {
            if (phase === "guessing") {
                // Transition to show answer phase (5 seconds) - music keeps playing!
                setPhase("answer");
                setTimeLeft(5);
            } else if (phase === "answer") {
                // Transition to inter-turn pause phase (2 seconds) - music fades out!
                setPhase("transition");
                setTimeLeft(2);
            } else if (phase === "transition") {
                // Transition to next turn, restart guessing (time seconds)
                setTurn((prev) => prev + 1);
                setPhase("guessing");
                setTimeLeft(time);
                setArtistGuess("");
                setTrackGuess("");
            }
        }
    }, [timeLeft, phase, time]);

    // Local decrescendo (fade out) of the audio during the last 2s of the answer phase
    useEffect(() => {
        if (!audioRef.current) return;

        if (phase === "answer" && timeLeft <= 2 && timeLeft > 0) {
            const startVolume = audioRef.current.volume;
            const duration = timeLeft * 1000; // remaining time in ms
            const tickRate = 50; // ms per volume step
            const steps = duration / tickRate;
            let currentStep = 0;

            const fadeInterval = setInterval(() => {
                currentStep++;
                if (audioRef.current) {
                    const targetVolume = Math.max(0, startVolume * (1 - currentStep / steps));
                    audioRef.current.volume = targetVolume;
                }
                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    if (audioRef.current) {
                        audioRef.current.pause();
                    }
                }
            }, tickRate);

            return () => clearInterval(fadeInterval);
        } else if (phase === "transition") {
            // Ensure audio is fully silent and paused during transition (Phase 3)
            audioRef.current.volume = 0;
            audioRef.current.pause();
        } else if (phase === "guessing") {
            // Reset volume to global setting at start of turn/guessing phase
            audioRef.current.volume = volume;
        }
    }, [timeLeft, phase, volume]);

    if (!toPlay || toPlay.length === 0) {
        return (
            <div className="flex flex-col items-center gap-8 min-h-screen justify-center">
                <h1>Music Blender</h1>
                <p>Chargement de la partie...</p>
            </div>
        );
    }

    if (turn > toPlay.length) {
        return (
            <div className="flex flex-col items-center gap-8 min-h-screen justify-center">
                <h1 className="text-4xl font-bold text-(--accent)">Partie terminée !</h1>
                <p className="text-xl">Merci d'avoir joué.</p>
            </div>
        );
    }

    const currentTrack = toPlay[turn - 1];
    const trackImage = currentTrack.imageUrl || null;
    const totalPhaseTime = phase === "guessing" ? time : 5;
    const showAnswer = phase === "answer";

    return (
        <div className="flex flex-col items-center gap-4 min-h-screen justify-center">
            <audio ref={audioRef} autoPlay src={currentTrack.previewUrl}></audio>

            {phase === "transition" ? (
                <div className="bg-black w-screen h-screen fixed inset-0 z-50 flex items-center justify-center">
                    {/* Écran noir durant la transition */}
                </div>
            ) : (
                <>
                    <h1>Music Blender</h1>
                    <section className="w-full relative">
                        {trackImage ? (
                            <Image
                                src={trackImage}
                                alt={currentTrack.name || "Cover"}
                                width={100}
                                height={100}
                                className={`w-full aspect-square transition-all rounded-lg overflow-hidden ${phase === "guessing" ? "blur-md" : "blur-none duration-300"}`}
                            />
                        ) : (
                            <div className="w-full aspect-square bg-gray-700 rounded-2xl flex items-center justify-center text-sm text-gray-400">
                                Pas d'image
                            </div>
                        )}

                        <div className={`absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 px-4 ${showAnswer ? "bg-black/75 opacity-100 pointer-events-auto" : "bg-black/0 opacity-0 pointer-events-none"}`}>
                            <p className="text-lg font-bold text-(--white)">{currentTrack.artist}</p>
                            <p className="text-lg text-(--white)">{currentTrack.name}</p>
                        </div>
                        <div className="absolute top-2 right-2">
                            <p className="text-sm">{turn}/{toPlay.length}</p>
                        </div>
                    </section>



                    <section className="flex flex-col gap-4 w-full">
                        <div className="flex flex-col">
                            <label htmlFor="artist-guess" className="text-xl">Artiste</label>
                            <input type="text" className="w-full px-4 py-2 rounded-lg text-(--background) bg-(--white)" value={artistGuess} onChange={(e) => setArtistGuess(e.target.value)} />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="track-guess" className="text-xl">Chanson</label>
                            <input type="text" className="w-full px-4 py-2 rounded-lg text-(--background) bg-(--white)" value={trackGuess} onChange={(e) => setTrackGuess(e.target.value)} />
                        </div>
                    </section>


                    <div className="flex flex-col items-center w-[calc(100vw-4rem)] max-w-lg gap-2 fixed bottom-6 left-1/2 -translate-x-1/2">
                        <span className="text-sm font-semibold tracking-wider text-gray-300">
                            {phase === "guessing"
                                ? `Temps restant : ${timeLeft}s`
                                : `Révélation : ${timeLeft}s`}
                        </span>
                        <div className="w-full bg-(--white)/20 h-2 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-linear ${phase === "guessing" ? "bg-(--accent)" : "bg-green-500"}`}
                                style={{ width: `${((totalPhaseTime - timeLeft) / totalPhaseTime) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
