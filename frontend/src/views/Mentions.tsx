"use client";

import React from "react";
import { useGame } from "@/context/GameContext";
import { useTranslation } from "@/context/LanguageContext";

import ChangeLanguage from "@/components/button/ChangeLanguage";
import Logo from "@/components/Logo";

export default function Mentions() {
  const { setView } = useGame();
  const { t } = useTranslation();
  const emailUser = "contact";
  const emailDomain = "xiao-web.com";

  return (
    <div className="my-16 flex flex-col items-center gap-4 md:gap-8">
      <ChangeLanguage />
      <Logo />
      <h1 className="text-center text-4xl font-bold">{t("mentions.title")}</h1>
      <p className="self-start text-xs text-(--white)/50">
        {t("mentions.last-updated")}
      </p>
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-sm text-(--white)/80">
        {/* SECTION 1: MENTIONS LEGALES */}
        <div className="bg flex w-full flex-col items-center gap-4">
          <h2 className="mb-2 text-center text-xl font-bold text-(--accent)">
            {t("mentions.legal-title")}
          </h2>
          <div className="flex w-full flex-col justify-between gap-2 md:flex-row">
            <div className="flex w-full flex-col items-center justify-center">
              <p>
                <span className="font-semibold">
                  {t("mentions.publisher-label")}
                </span>{" "}
                Alex Xiao
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
            <div className="mt-4 flex w-full flex-col items-center justify-center md:mt-0">
              <p>
                <span className="font-semibold">
                  {t("mentions.host-label")}
                </span>{" "}
                Hostinger
              </p>
              <p className="text-center leading-relaxed">
                {t("mentions.host-address-label")}
                <br />
                UAB "HOSTINGER LT",
                <br />
                Švitrigailos g. 34C, LT-03110 Vilnius,
                <br />
                {t("mentions.host-country")}
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
        <div className="mt-8 flex w-full flex-col gap-6">
          <h2 className="text-center text-2xl font-bold text-(--accent)">
            {t("mentions.privacy-title")}
          </h2>

          <p className="leading-relaxed">{t("mentions.privacy-intro")}</p>

          <hr className="w-full border-(--white)/10" />

          <div className="flex w-full flex-col gap-2">
            <h3 className="text-lg font-semibold">
              {t("mentions.section1-title")}
            </h3>
            <p
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("mentions.section1-text") }}
            />
          </div>

          <hr className="w-full border-(--white)/10" />

          <div className="flex w-full flex-col gap-4">
            <h3 className="text-lg font-semibold">
              {t("mentions.section2-title")}
            </h3>

            <p className="leading-relaxed">{t("mentions.section2-intro")}</p>

            <div className="w-full overflow-x-auto rounded-lg border border-(--white)/10">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-(--white)/5 font-semibold text-(--white)">
                    <th className="border-b border-(--white)/10 p-3">
                      {t("mentions.table-header-data")}
                    </th>
                    <th className="border-b border-(--white)/10 p-3">
                      {t("mentions.table-header-purpose")}
                    </th>
                    <th className="border-b border-(--white)/10 p-3">
                      {t("mentions.table-header-duration")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                    <td className="p-3 font-medium text-(--white)">
                      {t("mentions.data-username")}
                    </td>
                    <td className="p-3">{t("mentions.purpose-username")}</td>
                    <td className="p-3 text-(--white)/60">
                      {t("mentions.duration-username")}
                    </td>
                  </tr>
                  <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                    <td className="p-3 font-medium text-(--white)">
                      {t("mentions.data-room-code")}
                    </td>
                    <td className="p-3">{t("mentions.purpose-room-code")}</td>
                    <td className="p-3 text-(--white)/60">
                      {t("mentions.duration-room-code")}
                    </td>
                  </tr>
                  <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                    <td className="p-3 font-medium text-(--white)">
                      {t("mentions.data-playlist-url")}
                    </td>
                    <td className="p-3">
                      {t("mentions.purpose-playlist-url")}
                    </td>
                    <td className="p-3 text-(--white)/60">
                      {t("mentions.duration-playlist-url")}
                    </td>
                  </tr>
                  <tr className="border-b border-(--white)/5 hover:bg-(--white)/2">
                    <td className="p-3 font-medium text-(--white)">
                      {t("mentions.data-game-data")}
                    </td>
                    <td className="p-3">{t("mentions.purpose-game-data")}</td>
                    <td className="p-3 text-(--white)/60">
                      {t("mentions.duration-game-data")}
                    </td>
                  </tr>
                  <tr className="hover:bg-(--white)/2">
                    <td className="p-3 font-medium text-(--white)">
                      {t("mentions.data-music-list")}
                    </td>
                    <td className="p-3">{t("mentions.purpose-music-list")}</td>
                    <td className="p-3 text-(--white)/60">
                      {t("mentions.duration-music-list")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-center font-semibold">
              {t("mentions.data-policy-notice")}
            </p>
          </div>

          <hr className="w-full border-(--white)/10" />

          <div className="flex w-full flex-col gap-2">
            <h3 className="text-lg font-semibold">
              {t("mentions.section3-title")}
            </h3>
            <p
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("mentions.section3-text1") }}
            />
            <p
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("mentions.section3-text2") }}
            />
          </div>

          <hr className="w-full border-(--white)/10" />

          <div className="flex w-full flex-col gap-3">
            <h3 className="text-lg font-semibold">
              {t("mentions.section4-title")}
            </h3>

            <p
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("mentions.section4-text1") }}
            />

            <p className="leading-relaxed">{t("mentions.section4-text2")}</p>
            <p
              className="border-l-2 border-(--white)/50 pl-4 italic"
              dangerouslySetInnerHTML={{
                __html: t("mentions.section4-bullet1"),
              }}
            />

            <p className="mt-2 text-center font-semibold text-(--white)">
              {t("mentions.section4-subtitle")}
            </p>
            <p className="leading-relaxed">{t("mentions.section4-text3")}</p>
            <ul className="flex list-disc flex-col gap-2 pl-6">
              <li className="text-justify">{t("mentions.section4-bullet2")}</li>
              <li className="text-justify">{t("mentions.section4-bullet3")}</li>
            </ul>
          </div>

          <hr className="w-full border-(--white)/10" />

          <div className="flex w-full flex-col gap-2">
            <h3 className="text-lg font-semibold">
              {t("mentions.section5-title")}
            </h3>

            <p className="leading-relaxed">{t("mentions.section5-text1")}</p>

            <p
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("mentions.section5-text2") }}
            />

            <p className="leading-relaxed">{t("mentions.section5-text3")}</p>
            <div className="mt-2 text-center">
              <a
                className="font-semibold text-(--white) underline transition-all duration-300 hover:text-(--accent) active:text-(--accent)"
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
        {t("mentions.back")}
      </button>
    </div>
  );
}
