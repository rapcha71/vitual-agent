import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required for secure sessions");
  }

  // HTTPS required for secure cookies in production (Replit, Railway, Vercel)
  const isProduction = process.env.NODE_ENV === 'production';
  const useSecureCookie = isProduction; // Cualquier deploy en prod usa HTTPS
  console.log("Environment:", process.env.REPL_SLUG ? "Replit" : process.env.RAILWAY_PUBLIC_DOMAIN ? "Railway" : isProduction ? "Production" : "Local");
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax' as const, // Use 'lax' for first-party context (normal browser tabs)
      path: '/'
    },
    name: 'connect.sid',
    rolling: true
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting login for user:", username);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log("User not found:", username);
          return done(null, false, { message: "Usuario o contraseña inválidos" });
        }

        const passwordValid = await comparePasswords(password, user.password);

        if (!passwordValid) {
          console.log("Invalid password for user:", username);
          return done(null, false, { message: "Usuario o contraseña inválidos" });
        }

        console.log("Login successful for user:", username);
        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);

      if (existingUser) {
        return res.status(400).json({ message: "El correo ya está registrado" });
      }

      const hashedPassword = await hashPassword(userData.password);
      // Forzar is_admin a false para nuevos registros
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isAdmin: false, // Asegurar que nuevos usuarios nunca sean administradores
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error al iniciar sesión después del registro" });
        }
        res.status(201).json(user);
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Error en el registro" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciales inválidas" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Error al crear la sesión" });
        }
        // Return the full user object (without password) for the frontend
        const userResponse = {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          nickname: user.nickname,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          phoneNumber: user.phoneNumber,
          lastLoginAt: user.lastLoginAt
        };
        res.json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Error al destruir la sesión" });
        }
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        });
        console.log("Logout successful, session destroyed");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    res.json(req.user);
  });

  // Password reset request
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ message: "El correo electrónico es requerido" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: "Si el correo existe, recibirás un código de recuperación" });
      }

      // Generate a 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expireTime = Date.now() + (15 * 60 * 1000); // 15 minutes

      // Store reset code (in a real app, you'd send this via email)
      await storage.storePasswordResetCode(user.id, resetCode, expireTime);

      res.json({ 
        message: "Si el correo existe, recibirás un código de recuperación"
      });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Verify reset code and reset password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { username, resetCode, newPassword } = req.body;

      if (!username || !resetCode || !newPassword) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(400).json({ message: "Código de recuperación inválido" });
      }

      const isValidCode = await storage.verifyPasswordResetCode(user.id, resetCode);
      if (!isValidCode) {
        return res.status(400).json({ message: "Código de recuperación inválido o expirado" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      // Clear the reset code
      await storage.clearPasswordResetCode(user.id);

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });
}