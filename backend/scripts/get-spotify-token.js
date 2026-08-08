import http from "http";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

// Charger les variables .env
try {
    process.loadEnvFile();
} catch (e) {
    // Fallback si loadEnvFile n'est pas dispo sur d'anciennes versions de Node
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET?.trim();
const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("\n❌ Erreur : SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET est manquant dans votre fichier .env.");
    console.error("Veuillez d'abord remplir ces deux variables dans backend/.env.\n");
    process.exit(1);
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    
    if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        if (!code) {
            res.end("Erreur : Aucun code d'autorisation n'a ete recu.");
            return;
        }

        try {
            // Échanger le code contre un token d'accès
            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: REDIRECT_URI,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
                res.end(`<h3>Erreur lors de la récupération du token</h3><pre>${errText}</pre>`);
                return;
            }

            const data = await response.json();
            const token = data.access_token;

            // Mettre à jour le fichier .env
            const envPath = path.resolve(".env");
            let envContent = "";
            
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, "utf8");
            }

            if (envContent.includes("SPOTIFY_ACCESS_TOKEN=")) {
                envContent = envContent.replace(/SPOTIFY_ACCESS_TOKEN=.*/, `SPOTIFY_ACCESS_TOKEN=${token}`);
            } else {
                // Ajouter une nouvelle ligne proprement
                envContent = envContent.trim() + `\nSPOTIFY_ACCESS_TOKEN=${token}\n`;
            }

            fs.writeFileSync(envPath, envContent, "utf8");

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`
                <html>
                    <body style="font-family: system-ui, sans-serif; text-align: center; padding: 50px; background-color: #121212; color: white;">
                        <h1 style="color: #1DB954; font-size: 32px;">Succès !</h1>
                        <p style="font-size: 18px;">Le token d'accès a été généré et inséré directement dans votre fichier <b>.env</b> !</p>
                        <p style="color: #b3b3b3;">Vous pouvez fermer cet onglet et relancer votre serveur.</p>
                    </body>
                </html>
            `);

            console.log("\n=======================================================");
            console.log("👉 SPOTIFY_ACCESS_TOKEN mis à jour avec succès dans le .env !");
            console.log("=======================================================\n");

            setTimeout(() => {
                server.close();
                process.exit(0);
            }, 1000);

        } catch (err) {
            console.error("Erreur système:", err);
            res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(`Erreur système : ${err.message}`);
        }
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});

server.listen(PORT, () => {
    const scopes = "playlist-read-private playlist-read-collaborative";
    const authUrl = `https://accounts.spotify.com/authorize?` + new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: scopes,
        redirect_uri: REDIRECT_URI,
    }).toString();

    console.log(`\n[Spotify OAuth] Serveur local démarré sur le port ${PORT}`);
    console.log("[Spotify OAuth] Ouverture de la page d'autorisation dans votre navigateur...");
    
    // Ouvrir le navigateur selon la plateforme
    const command = process.platform === "win32"
        ? `start "" "${authUrl}"`
        : `${process.platform === "darwin" ? "open" : "xdg-open"} "${authUrl}"`;
    exec(command);
});
