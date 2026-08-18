export const getSocketUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  // Si on est sur localhost dans le navigateur, on priorise le serveur local pour le développement
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocalhost) {
      return "http://localhost:4000";
    }
  }

  // Sinon (en production), on utilise la variable d'environnement ou le serveur public par défaut
  return envUrl && envUrl !== "undefined"
    ? envUrl
    : "https://music-blender_serv.xiao-web.com";
};
