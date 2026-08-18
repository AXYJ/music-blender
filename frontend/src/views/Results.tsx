"use client";

// Import de next
import Image from "next/image";

//Import React
import { useState } from "react";

// Import du contexte
import { useGame } from "../context/GameContext";

export default function Results() {
  const { players, toPlay, restart } = useGame();
  const [currentTrackIndex, setCurrentTrackIndex] = useState(1);

  players.sort((a, b) => b.score - a.score);

  const nextTrack = () => {
    if (currentTrackIndex < toPlay.length) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    } else {
      setCurrentTrackIndex(1);
    }
  };

  const prevTrack = () => {
    if (currentTrackIndex > 1) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    } else {
      setCurrentTrackIndex(toPlay.length);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto px-4 my-16 relative">
      <h1 className="text-3xl font-bold">Résultat de la partie</h1>

      <section className="relative w-full overflow-hidden">
        {/* Sliding Track */}
        <div
          className="flex w-full transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${(currentTrackIndex - 1) * 100}%)`,
          }}
        >
          {toPlay?.map((track, index) => (
            <article
              key={index}
              className="w-full flex-shrink-0 flex flex-col gap-6 items-center relative"
            >
              <div
                className="carousel-item-top flex gap-4 items-end w-3/5 max-w-xs relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                onClick={() => {
                  window.open(track.url, "_blank");
                }}
              >
                <Image
                  className="w-full h-full object-cover"
                  src={track.imageUrl}
                  alt={track.name}
                  width={250}
                  height={250}
                />
                <div className="flex flex-col absolute bottom-4 right-4 text-right z-10 pointer-events-none">
                  <p className="artist-name text-sm font-semibold">
                    {track.artist}
                  </p>
                  <p className="track-name text-lg font-bold">{track.name}</p>
                </div>
              </div>

              <div className="w-full max-w-xl overflow-x-auto max-h-[25vh] overflow-y-auto">
                <table className="carousel-item-bottom w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                        Joueur
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                        Artiste(s)
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                        Musique
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players?.map((player, order) => (
                      <tr
                        key={order}
                        className="carousel-item-bottom-player border-t border-white/5"
                      >
                        <td className="px-4 py-3 font-semibold text-xs text-center">
                          {player.name + " (" + player.score + ")"}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs text-center ${
                            player.artists_final_board?.[index]
                              ? player.artists_scores_board?.[index] === 1
                                ? "text-(--green) font-medium"
                                : player.artists_scores_board?.[index] === 0.5
                                  ? "text-amber-500 font-medium"
                                  : "text-(--red)"
                              : ""
                          }`}
                        >
                          {player.artists_final_board?.[index] || ""}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs text-center ${
                            player.tracks_final_board?.[index]
                              ? player.tracks_scores_board?.[index]
                                ? "text-(--green) font-medium"
                                : "text-(--red)"
                              : ""
                          }`}
                        >
                          {player.tracks_final_board?.[index] || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-4">
        <button
          className="rounded-full px-8 py-2 bg-(--accent) hover:bg-(--semiaccent) text-(--white) font-semibold transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
          onClick={() => restart()}
        >
          Rejouer
        </button>
      </div>

      {/* Carousel controls (outside sliding div to keep them fixed) */}
      {toPlay.length > 1 && (
        <>
          <button
            className="h-10 w-10 md:h-12 md:w-12 bg-(--accent) hover:bg-(--semiaccent) text-(--white) rounded-full absolute top-1/3 md:top-48 lg:top-56 left-4 -translate-y-1/2 flex items-center justify-center transition-all z-20 cursor-pointer shadow-lg active:scale-95"
            onClick={prevTrack}
          >
            &#10094;
          </button>
          <button
            className="h-10 w-10 md:h-12 md:w-12 bg-(--accent) hover:bg-(--semiaccent) text-(--white) rounded-full absolute top-1/3 md:top-48 lg:top-56 right-4 -translate-y-1/2 flex items-center justify-center transition-all z-20 cursor-pointer shadow-lg active:scale-95"
            onClick={nextTrack}
          >
            &#10095;
          </button>
        </>
      )}
    </div>
  );
}
