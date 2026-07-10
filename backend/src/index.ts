import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middlewares
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'https://atelier.lizdesign.com.br'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/$/, ''));
}

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(allowed => 
      allowed.trim().replace(/\/$/, '') === normalizedOrigin
    );
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// Health Check (útil para o Render)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import analyticsRoutes from './routes/analytics';
import chatRoutes from './routes/chat';
import clientRoutes from './routes/clients';
import studioRoutes from './routes/studio';
import managementRoutes from './routes/management';

// Rotas Base da API v1
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/studio', studioRoutes);
app.use('/api/v1/management', managementRoutes);

app.listen(port, () => {
  console.log(`[Backend] Atelier API rodando na porta ${port}`);
});
