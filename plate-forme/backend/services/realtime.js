const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

let io;
const connectedUsers = new Map();

const emitRealtimeEvent = (event, payload) => {
  if (io) io.emit(event, payload);
};

const emitToRoles = (roles, event, payload) => {
  if (!io) return;
  io.to(roles.map((role) => `role:${role}`)).emit(event, payload);
};

const emitRoomEvent = (room, event, payload) => {
  if (io) io.to(room).emit(event, payload);
};

const disconnectUser = (userId) => {
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
};

const canJoinForum = async (user, forumId) => {
  if (!user) return false;

  if (user.role === 'APPRENANT') {
    const result = await db.query(
      `SELECT 1
       FROM forum fo
       JOIN inscription i ON i.id_formation = fo.id_formation AND i.statut = 'ACCEPTEE'
       JOIN apprenant a ON a.id_candidat = i.id_candidat
       JOIN formation f ON f.id_formation = fo.id_formation
       WHERE fo.id_forum = $1 AND a.id_utilisateur = $2 AND f.date_fin >= CURRENT_DATE`,
      [forumId, user.id_utilisateur]
    );
    return result.rowCount > 0;
  }

  if (user.role === 'FORMATEUR') {
    const result = await db.query(
      `SELECT 1
       FROM forum fo
       JOIN formation_formateur ff ON ff.id_formation = fo.id_formation
       JOIN formateur f ON f.id_formateur = ff.id_formateur
       WHERE fo.id_forum = $1 AND f.id_utilisateur = $2`,
      [forumId, user.id_utilisateur]
    );
    return result.rowCount > 0;
  }

  return false;
};

const initializeRealtime = (server, app) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });
  app.set('io', io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.user = null;
      return next();
    }

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_key');
      const result = await db.query(
        'SELECT statut_compte FROM utilisateur WHERE id_utilisateur = $1',
        [socket.user.id_utilisateur]
      );
      if (!result.rows[0] || result.rows[0].statut_compte !== 'ACTIF') {
        return next(new Error('Compte inactif.'));
      }
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return next(new Error('Token invalide ou expiré.'));
      }
      console.error('Erreur lors de l’authentification WebSocket :', error);
      next(new Error('Erreur d’authentification.'));
    }
  });

  io.on('connection', async (socket) => {
    if (!socket.user) {
      socket.on('forum:join', (forumId, acknowledge = () => {}) => {
        if (typeof acknowledge === 'function') acknowledge({ joined: false });
      });
      return;
    }

    socket.join(`role:${socket.user.role}`);
    const userId = String(socket.user.id_utilisateur);
    socket.join(`user:${userId}`);
    const connectedAt = new Date().toISOString();
    let userConnections = connectedUsers.get(userId);

    if (!userConnections) {
      userConnections = new Set();
      connectedUsers.set(userId, userConnections);
    }
    userConnections.add(socket.id);

    if (socket.user.role === 'ADMINISTRATEUR') {
      socket.join('administrators');
      socket.emit('users:presence', [...connectedUsers.keys()].map((id) => ({
        id_utilisateur: Number(id),
        is_online: true
      })));

      socket.on('users:presence:request', () => {
        socket.emit('users:presence', [...connectedUsers.keys()].map((id) => ({
          id_utilisateur: Number(id),
          is_online: true
        })));
      });
    }

    try {
      await db.query(
        'UPDATE utilisateur SET date_derniere_connexion = CURRENT_TIMESTAMP WHERE id_utilisateur = $1',
        [socket.user.id_utilisateur]
      );
      if (userConnections.size === 1) {
        io.to('administrators').emit('user:presence', {
          id_utilisateur: socket.user.id_utilisateur,
          is_online: true,
          date_derniere_connexion: connectedAt
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la présence utilisateur :', error);
    }

    socket.on('forum:join', async (forumId, acknowledge = () => {}) => {
      const respond = typeof acknowledge === 'function' ? acknowledge : () => {};
      if (!/^\d+$/.test(String(forumId))) {
        respond({ joined: false });
        return;
      }

      try {
        const allowed = await canJoinForum(socket.user, forumId);
        if (!allowed) {
          respond({ joined: false });
          return;
        }

        await socket.join(`forum:${forumId}`);
        respond({ joined: true });
      } catch (error) {
        console.error('Erreur lors de la vérification d’accès au forum :', error);
        respond({ joined: false });
      }
    });

    socket.on('forum:leave', (forumId) => {
      if (/^\d+$/.test(String(forumId))) socket.leave(`forum:${forumId}`);
    });

    socket.on('disconnect', async () => {
      const currentConnections = connectedUsers.get(userId);
      if (!currentConnections) return;
      currentConnections.delete(socket.id);
      if (currentConnections.size > 0) return;

      connectedUsers.delete(userId);
      const disconnectedAt = new Date().toISOString();
      try {
        await db.query(
          'UPDATE utilisateur SET date_derniere_deconnexion = CURRENT_TIMESTAMP WHERE id_utilisateur = $1',
          [socket.user.id_utilisateur]
        );
        io.to('administrators').emit('user:presence', {
          id_utilisateur: socket.user.id_utilisateur,
          is_online: false,
          date_derniere_deconnexion: disconnectedAt
        });
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la déconnexion utilisateur :', error);
      }
    });
  });

  return io;
};

module.exports = { initializeRealtime, emitRealtimeEvent, emitToRoles, emitRoomEvent, disconnectUser };
