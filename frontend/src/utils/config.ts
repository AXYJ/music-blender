// Machine locale ou réseau privé : développement, pas de serveur public
export const isLocalHost = (hostname: string): boolean =>
  /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.+\.local)$/.test(
    hostname,
  );

export const getSocketUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  // Si on est sur un environnement local dans le navigateur, on priorise le serveur local pour le développement
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (isLocalHost(hostname)) {
      return `http://${hostname}:4000`;
    }
  }

  // Sinon (en production), on utilise la variable d'environnement ou le serveur public par défaut
  return envUrl && envUrl !== "undefined"
    ? envUrl
    : "https://music-blender-serv.xiao-web.com";
};
