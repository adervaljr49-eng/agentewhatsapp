import express from "express";
import { createServer as createViteServer } from "vite";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Gerenciamento de sessões WhatsApp
const sessions = new Map<string, any>();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  app.use(express.json());

  // Função para conectar WhatsApp
  async function connectToWhatsApp(userId: string, socketId?: string) {
    const sessionDir = path.join(process.cwd(), 'sessions', userId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: true
    });

    sessions.set(userId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataURL = await QRCode.toDataURL(qr);
        if (socketId) {
          io.to(socketId).emit('whatsapp-qr', { userId, qr: qrDataURL });
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isQrTimeout = lastDisconnect?.error?.message === 'QR refs attempts ended';
        
        const shouldReconnect = !isLoggedOut && !isQrTimeout;
        console.log('Connection closed due to ', lastDisconnect?.error?.message || lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        if (shouldReconnect) {
          connectToWhatsApp(userId, socketId);
        } else {
          sessions.delete(userId);
          if (socketId) {
            io.to(socketId).emit('whatsapp-status', { userId, status: isLoggedOut ? 'loggedOut' : 'disconnected' });
          }
        }
      } else if (connection === 'open') {
        console.log('Opened connection');
        if (socketId) {
          io.to(socketId).emit('whatsapp-status', { userId, status: 'connected' });
        }
      }
    });

    return sock;
  }

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('whatsapp-init', async ({ userId }) => {
      console.log('Initializing WhatsApp for user:', userId);
      const existingSock = sessions.get(userId);
      
      if (existingSock && existingSock.user) {
        socket.emit('whatsapp-status', { userId, status: 'connected' });
      } else {
        await connectToWhatsApp(userId, socket.id);
      }
    });

    socket.on('whatsapp-logout', async ({ userId }) => {
      const sock = sessions.get(userId);
      if (sock) {
        await sock.logout();
        sessions.delete(userId);
        socket.emit('whatsapp-status', { userId, status: 'loggedOut' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // API para enviar mensagem via WhatsApp conectado
  app.post("/api/whatsapp/send", async (req, res) => {
    const { userId, phone, message } = req.body;

    if (!userId || !phone || !message) {
      return res.status(400).json({ error: "Parâmetros insuficientes" });
    }

    const sock = sessions.get(userId);
    if (!sock || !sock.user) {
      return res.status(401).json({ error: "WhatsApp não conectado" });
    }

    try {
      // Formata o número (remove caracteres não numéricos e adiciona @s.whatsapp.net)
      const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: message });
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      res.status(500).json({ error: "Falha ao enviar mensagem" });
    }
  });

  // API para compilar e baixar o projeto (para hospedagem)
  app.get("/api/download-dist", async (req, res) => {
    try {
      console.log("Iniciando build para download...");
      // Executa o build via npx para garantir que temos a versão mais recente
      await execAsync("npx vite build");
      
      const zip = new AdmZip();
      const distPath = path.join(process.cwd(), "dist");
      
      if (!fs.existsSync(distPath)) {
        return res.status(500).json({ error: "Falha ao gerar os arquivos de build." });
      }

      zip.addLocalFolder(distPath);
      const buffer = zip.toBuffer();
      
      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="whatsagent-ai-hospedagem.zip"`,
        "Content-Length": buffer.length,
      });

      res.send(buffer);
    } catch (error) {
      console.error("Erro ao gerar build/ZIP:", error);
      res.status(500).json({ error: "Falha ao compilar o site. Tente novamente." });
    }
  });

  // API para download do projeto completo (código fonte)
  app.get("/api/download-project", (req, res) => {
    try {
      const zip = new AdmZip();
      const rootDir = process.cwd();
      
      // Lista de arquivos e pastas para incluir no ZIP
      const include = [
        "src",
        "components",
        "public",
        "App.tsx",
        "main.tsx",
        "types.ts",
        "index.css",
        "package.json",
        "tsconfig.json",
        "vite.config.ts",
        "index.html",
        "metadata.json",
        ".env.example"
      ];

      include.forEach(item => {
        const itemPath = path.join(rootDir, item);
        if (fs.existsSync(itemPath)) {
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            zip.addLocalFolder(itemPath, item);
          } else {
            zip.addLocalFile(itemPath);
          }
        }
      });

      const buffer = zip.toBuffer();
      
      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="whatsagent-ai-project.zip"`,
        "Content-Length": buffer.length,
      });

      res.send(buffer);
    } catch (error) {
      console.error("Erro ao gerar ZIP:", error);
      res.status(500).json({ error: "Falha ao gerar o arquivo de download." });
    }
  });

  // Webhook Endpoint
  app.post("/api/webhook/:userId", async (req, res) => {
    const { userId } = req.params;
    const payload = req.body;

    try {
      console.log(`Webhook received for user ${userId}:`, payload);
      res.status(200).json({ success: true, message: 'Webhook recebido com sucesso (modo local)' });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false, error: 'Falha ao processar webhook' });
    }
  });

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Servir arquivos estáticos em produção
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
