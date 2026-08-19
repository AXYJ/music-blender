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
    <div className="relative mx-auto my-16 flex w-full max-w-4xl flex-col items-center gap-6 px-4">
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
              className="relative flex w-full flex-shrink-0 flex-col items-center gap-6 p-4"
            >
              <div
                className="carousel-item-top relative flex aspect-square w-3/5 max-w-xs cursor-pointer items-end gap-4 overflow-hidden rounded-lg transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                onClick={() => {
                  window.open(track.url, "_blank");
                }}
              >
                <Image
                  className="h-full w-full object-cover"
                  src={track.imageUrl}
                  alt={track.name}
                  width={250}
                  height={250}
                />
                <div className="pointer-events-none absolute right-4 bottom-4 z-10 flex flex-col text-right">
                  <p className="artist-name text-sm font-semibold">
                    {track.artist}
                  </p>
                  <p className="track-name text-lg font-bold">{track.name}</p>
                </div>
              </div>

              <div className="max-h-[25vh] w-full max-w-xl overflow-x-auto overflow-y-auto">
                <table className="carousel-item-bottom w-full">
                  <thead className="border-b-2 border-(--accent)">
                    <tr>
                      <th className="px-4 py-2 text-center text-xs font-semibold tracking-wider uppercase">
                        Joueur
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold tracking-wider uppercase">
                        Artiste(s)
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold tracking-wider uppercase">
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
                        <td
                          className={`px-4 py-3 text-center text-xs font-semibold ${
                            order === 0 ? "pt-4" : ""
                          }`}
                        >
                          {player.name + " (" + player.score + ")"}
                        </td>
                        <td
                          className={`px-4 py-3 text-center text-xs ${order === 0 ? "pt-4" : ""} ${
                            player.artists_final_board?.[index]
                              ? player.artists_scores_board?.[index] === 1
                                ? "font-medium text-(--green)"
                                : player.artists_scores_board?.[index] === 0.5
                                  ? "font-medium text-amber-500"
                                  : "text-(--red)"
                              : ""
                          }`}
                        >
                          {player.artists_final_board?.[index] || ""}
                        </td>
                        <td
                          className={`px-4 py-3 text-center text-xs ${order === 0 ? "pt-4" : ""} ${
                            player.tracks_final_board?.[index]
                              ? player.tracks_scores_board?.[index]
                                ? "font-medium text-(--green)"
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
      <div className="mt-4 flex gap-4">
        <button
          className="cursor-pointer rounded-full bg-(--accent) px-8 py-2 font-semibold text-(--white) shadow-md transition-all hover:scale-105 hover:bg-(--semiaccent) hover:shadow-lg active:scale-95"
          onClick={() => restart()}
        >
          Rejouer
        </button>
      </div>

      {/* Carousel controls (outside sliding div to keep them fixed) */}
      {toPlay.length > 1 && (
        <>
          <button
            className="absolute top-2/5 left-8 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-(--accent) text-(--white) shadow-lg transition-all hover:bg-(--semiaccent) active:scale-95 md:top-48 md:h-12 md:w-12 lg:top-56"
            onClick={prevTrack}
          >
            &#10094;
          </button>
          <button
            className="absolute top-2/5 right-8 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-(--accent) text-(--white) shadow-lg transition-all hover:bg-(--semiaccent) active:scale-95 md:top-48 md:h-12 md:w-12 lg:top-56"
            onClick={nextTrack}
          >
            &#10095;
          </button>
        </>
      )}
    </div>
  );
}
