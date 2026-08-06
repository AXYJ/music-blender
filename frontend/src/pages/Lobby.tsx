"use client"

// Import de react
import { useState } from "react";

// Import du contexte
import { useGame } from "../context/GameContext";

// Import des composants
import Section from "../components/Section";

export default function Lobby() {
    const { roomCode, players, socket, beReady } = useGame();

    const [amount, setAmount] = useState(3);
    const [time, setTime] = useState(30);

    const me = players.find((p) => p.socketId === socket?.id);
    const isHost = me?.isHost || false;
    const isReady = me?.isReady || false;

    return (
        <div className="flex flex-col items-center gap-8">
            <h1 className="text-4xl font-bold text-(--accent) text-center">Music Blender</h1>

            <div className="flex flex-col gap-4"    >
                <div className="flex flex-col items-center gap-8">
                    <p className="text-xl font-bold text-(--white) text-center">Code de la partie : {roomCode}</p>
                </div>
                <Section>
                    <h2>Liste des joueurs</h2>
                    <div className="flex flex-col gap-2 h-[25vh] overflow-y-auto">
                        {players.map((player) => (
                            <p key={player.id} className={`px-3 py-2 rounded-full transition-all duration-300 ${player.isReady ? "text-(--white) bg-(--accent)" : "text-(--background) bg-(--grey)"}`}>
                                {player.name}
                            </p>
                        ))}
                    </div>
                </Section>
                <Section>
                    <h2>Paramètres de la partie</h2>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <p>Nombre de musique par playlist</p>
                            <div className="flex items-center justify-center gap-4">
                                <button className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${amount === 1 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => { setAmount(Math.max(1, amount - 1)) }}>-</button>
                                <p>{amount}</p>
                                <button className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${amount === 20 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => { setAmount(Math.min(20, amount + 1)) }}>+</button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <p>Temps par musique</p>
                            <div className="flex items-center justify-center gap-4">
                                <button className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${time === 5 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => { setTime(Math.max(5, time - 5)) }}>-</button>
                                <p>{time}</p>
                                <button className={`rounded-full bg-(--white) aspect-square text-(--background) h-8 w-8 ${time === 30 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => { setTime(Math.min(30, time + 5)) }}>+</button>
                            </div>
                        </div>
                    </div>
                </Section>
                <Section>
                    <h2>Ajoute ta musique</h2>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <p>Plateforme de streaming</p>
                            <select name="stream-service" id="stream" className="rounded-md p-2 bg-(--white) text-(--background)">
                                <option value="spotify">Spotify</option>
                                <option value="deezer">Deezer</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p>URL de la playlist</p>
                            <input type="text" className="h-8 w-full px-4 rounded-lg text-base bg-(--white) text-(--background)" />
                        </div>
                    </div>
                </Section>
            </div>

            <div className="w-full flex justify-between gap-4">
                <button className="rounded-full px-8 py-2 bg-(--white) text-(--background) flex-1">Quitter</button>
                {isHost &&
                    <button className="rounded-full px-8 py-2 bg-(--accent) text-(--white) flex-1">Lancer</button>
                }
                {!isHost &&
                    <button className={`rounded-full px-8 py-2 transition-colors  flex-1 duration-300 ${!isReady ? "bg-(--accent) text-(--white)" : "bg-(--grey) text-(--background)"}`} onClick={() => { beReady() }}>{isReady ? "Annuler" : "Prêt"}</button>
                }
            </div>
        </div>
    );
}