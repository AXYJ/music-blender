"use client";

import React from "react";
import { useGame } from "../context/GameContext";

export default function Mentions() {
    const { setView } = useGame();
    const emailUser = "contact";
    const emailDomain = "xiao-web.com";

    return (
        <div className="my-auto flex min-h-screen w-full flex-col items-center justify-center gap-8 px-4 py-16">
            <h1 className="text-center text-4xl font-bold text-(--accent)">
                Mentions légales &amp; Politique de confidentialité
            </h1>
            <p className="text-xs text-(--white)/50 self-start">
                Dernière mise à jour : 22 août 2026
            </p>
            <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-sm text-(--white)/80">

                {/* SECTION 1: MENTIONS LEGALES */}
                <div className="w-full flex flex-col items-center gap-4 bg">
                    <h2 className="text-center text-xl font-bold text-(--accent) mb-2">
                        Mentions légales
                    </h2>
                    <div className="flex w-full justify-between gap-2 md:flex-row flex-col">
                        <div className="w-full flex flex-col items-center justify-center">
                            <p>
                                <span className="font-semibold">Éditeur :</span> Alex Xiao
                            </p>
                            <a
                                className="text-(--white) underline transition-all duration-300 hover:text-(--accent) active:text-(--accent)"
                                href={`mailto:${emailUser}@${emailDomain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {emailUser} [at] {emailDomain}
                            </a>
                        </div>
                        <div className="w-full flex flex-col items-center justify-center mt-4  md:mt-0">
                            <p>
                                <span className="font-semibold">Hébergeur :</span> Hostinger
                            </p>
                            <p className="text-center leading-relaxed">
                                Adresse postale :
                                <br />
                                UAB "HOSTINGER LT",
                                <br />
                                Švitrigailos g. 34C, LT-03110 Vilnius,
                                <br />
                                Lituanie
                            </p>
                            <a
                                className="text-(--white) underline transition-all duration-300 hover:text-(--accent) active:text-(--accent)"
                                href="https://www.hostinger.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                www.hostinger.com
                            </a>
                        </div>

                    </div>

                </div>

                {/* SECTION 2: POLITIQUE DE CONFIDENTIALITE */}
                <div className="w-full flex flex-col gap-6 mt-8">
                    <h2 className="text-center text-2xl font-bold text-(--accent)">
                        Politique de confidentialité
                    </h2>


                    <p className="text-justify leading-relaxed">
                        La protection de votre vie privée et de vos données personnelles est une priorité. Cette politique de confidentialité explique en toute transparence quelles données sont traitées lors de votre utilisation du jeu, pour quelles finalités et comment elles sont gérées.
                    </p>

                    <hr className="w-full border-(--white)/10" />

                    <div className="w-full flex flex-col gap-2">
                        <h3 className="text-lg font-semibold">
                            1. Principe général : Le respect de la vie privée par défaut
                        </h3>
                        <p className="text-justify leading-relaxed">
                            Le jeu est conçu selon le principe de minimisation des données : <strong>aucune donnée n'est conservée à long terme</strong>. Le traitement des données est temporaire, strictement limité au temps d'une session de jeu, et hébergé en mémoire volatile (RAM).
                        </p>
                    </div>

                    <hr className="w-full border-(--white)/10" />

                    <div className="w-full flex flex-col gap-4">
                        <h3 className="text-lg font-semibold">
                            2. Données traitées et finalités
                        </h3>

                        <p className="text-justify leading-relaxed">
                            Pendant votre navigation et vos parties, nous traitons uniquement les éléments suivants :
                        </p>

                        <div className="w-full overflow-x-auto rounded-lg border border-(--white)/10">
                            <table className="w-full min-w-[500px] border-collapse text-left text-xs">
                                <thead>
                                    <tr className="bg-(--white)/5 text-(--white) font-semibold">
                                        <th className="p-3 border-b border-(--white)/10">Donnée collectée</th>
                                        <th className="p-3 border-b border-(--white)/10">Finalité</th>
                                        <th className="p-3 border-b border-(--white)/10">Durée de conservation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                                        <td className="p-3 font-medium text-(--white)">Pseudonyme</td>
                                        <td className="p-3">Identifier le joueur auprès des autres participants dans le salon.</td>
                                        <td className="p-3 text-(--white)/60">Supprimé dès la fermeture du salon. (Peut être stocké localement sur votre navigateur pour votre confort).</td>
                                    </tr>
                                    <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                                        <td className="p-3 font-medium text-(--white)">Code / Numéro de salon</td>
                                        <td className="p-3">Permettre aux joueurs de rejoindre la même partie multijoueur.</td>
                                        <td className="p-3 text-(--white)/60">Supprimé dès que la partie se termine ou que tous les joueurs quittent le salon.</td>
                                    </tr>
                                    <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                                        <td className="p-3 font-medium text-(--white)">URL de playlist</td>
                                        <td className="p-3">Charger et synchroniser les pistes audio pour la partie en cours.</td>
                                        <td className="p-3 text-(--white)/60">Supprimée à la fermeture du salon.</td>
                                    </tr>
                                    <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                                        <td className="p-3 font-medium text-(--white)">Données de partie</td>
                                        <td className="p-3">Assurer le bon fonctionnement des mécaniques de jeu en temps réel via WebSockets (scores, réponses, état du jeu).</td>
                                        <td className="p-3 text-(--white)/60">Supprimées automatiquement dès que tous les joueurs quittent le salon.</td>
                                    </tr>
                                    <tr className="hover:bg-(--white)/2">
                                        <td className="p-3 font-medium text-(--white)">Liste des musiques</td>
                                        <td className="p-3">Optimiser le chargement et éviter les requêtes répétitives pendant la session (Cache technique).</td>
                                        <td className="p-3 text-(--white)/60">Conservée temporairement en mémoire cache et purgée régulièrement.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="text-center font-semibold mt-2">
                            Aucune donnée n'est vendue, cédée, ni partagée avec des régies publicitaires ou des tiers à des fins marketing.
                        </p>
                    </div>

                    <hr className="w-full border-(--white)/10" />

                    <div className="w-full flex flex-col gap-2">
                        <h3 className="text-lg font-semibold">
                            3. Durée de conservation et suppression automatique
                        </h3>
                        <p className="text-justify leading-relaxed">
                            <strong>Suppression immédiate :</strong> Dès que tous les joueurs quittent un salon de jeu, l'intégralité des données rattachées à ce salon (salon, pseudos, scores, états de partie) est <strong>définitivement effacée de la mémoire du serveur</strong>.
                        </p>
                        <p className="text-justify leading-relaxed">
                            <strong>Absence de base de données persistante :</strong> Aucune information relative à vos parties, historiques ou habitudes de jeu n'est enregistrée dans une base de données permanente.
                        </p>
                    </div>

                    <hr className="w-full border-(--white)/10" />

                    <div className="w-full flex flex-col gap-3">
                        <h3 className="text-lg font-semibold">
                            4. Cookies et stockage local (LocalStorage / SessionStorage)
                        </h3>

                        <p className="text-justify leading-relaxed">
                            Ce site <strong>n'utilise aucun cookie publicitaire, aucun traceur tiers et aucun outil d'analyse d'audience invasif</strong> (type Google Analytics).
                        </p>

                        <p className="text-justify leading-relaxed">
                            Seuls des éléments strictement techniques et nécessaires au fonctionnement du service peuvent être déposés sur votre terminal :
                        </p>
                        <p className="pl-4 border-l-2 border-(--accent)/50 italic text-justify">
                            <strong>Stockage local de confort :</strong> Votre navigateur peut garder en mémoire locale votre dernier pseudonyme utilisé ou le dernier code de salon pour vous éviter de les retaper lors d'un rechargement de page.
                        </p>

                        <p className="font-semibold mt-2 text-center text-(--white)">
                            Gestion et suppression :
                        </p>
                        <p className="text-justify leading-relaxed">
                            Conformément aux recommandations de la CNIL et du RGPD, ces traceurs purement techniques ne requièrent pas de consentement préalable par bandeau. Si vous souhaitez supprimer ces éléments locaux, vous pouvez le faire à tout moment :
                        </p>
                        <ul className="list-disc pl-6 flex flex-col gap-2">
                            <li className="text-justify">
                                Directement depuis les paramètres de votre navigateur (section "Historique" {"->"} "Effacer les données de navigation / Cookies et données de sites").
                            </li>
                            <li className="text-justify">
                                Via l'outil d'inspection de votre navigateur (F12 {"->"} Onglet Application ou Stockage {"->"} Local Storage / Cookies {"->"} Effacer).
                            </li>
                        </ul>
                    </div>

                    <hr className="w-full border-(--white)/10" />

                    <div className="w-full flex flex-col gap-2">
                        <h3 className="text-lg font-semibold">
                            5. Vos droits (RGPD)
                        </h3>

                        <p className="text-justify leading-relaxed">
                            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.
                        </p>

                        <p className="text-justify leading-relaxed">
                            Compte tenu de l'absence de stockage persistant et de comptes utilisateurs, <strong>quitter la partie et fermer votre navigateur supprime de facto l'ensemble de vos données de session</strong>.
                        </p>

                        <p className="text-justify leading-relaxed">
                            Pour toute question ou demande relative à vos données, vous pouvez contacter l'éditeur du site à l'adresse suivante :
                        </p>
                        <div className="text-center mt-2">
                            <a
                                className="text-(--white) underline font-semibold transition-all duration-300 hover:text-(--accent) active:text-(--accent)"
                                href={`mailto:${emailUser}@${emailDomain}`}
                            >
                                {emailUser} [at] {emailDomain}
                            </a>
                        </div>
                    </div>
                </div>

            </div>

            <button
                className="rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95"
                onClick={() => setView("home")}
            >
                Retour
            </button>
        </div>
    );
}