# CxO Ninja - Your Digital C-Suite

Your digital C-Suite that allows users to consult with a team of AI executives (CFO, CTO, CPO, etc.) on strategic business questions. Each AI agent forms their own opinion based on their expertise, and a Chair synthesizes all perspectives into a unified recommendation.

![CxO Ninja](https://img.shields.io/badge/CxO-Ninja-gold?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square)

## Features

### For Users
- **Hire AI Executives**: Build your own C-Suite by selecting from available AI agents (CFO, CTO, CPO, COO, CHRO, Architect, etc.)
- **C-Suite Meetings**: Ask strategic questions and receive opinions from each executive
- **Meeting Notes**: Access complete records of all C-Suite deliberations with individual opinions and reasoning
- **Company Context**: Upload financial statements, presentations, and other documents to provide context for better advice
- **Chair's Summary**: Get synthesized recommendations from the Chair based on all opinions

### For Administrators
- **User Management**: Create, activate/deactivate, and manage user accounts
- **Agent Creation**: Define new AI executives with custom system prompts
- **Expertise Weights**: Configure each agent's expertise in 5 areas: Finance, Technology, Operations, People/HR, and Logistics
- **Model Selection**: Choose which OpenAI model each agent uses (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- **API Configuration**: Set the OpenAI API key through the admin panel

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - User management and authentication
- **MongoDB** - Document storage for agents, meetings, and opinions
- **OpenAI API** - AI reasoning engine
- **JWT Authentication** - Secure token-based auth

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **Vite** - Build tool
- **PWA** - Progressive Web App with offline support

## Quick Start with Docker

The entire application is containerized and managed through Docker Compose. This is the recommended way to run the application.

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)

### Running the Application

1. **Clone the repository**:
```bash
git clone <repository-url>
cd cxo-ninja
```

2. **Start all services**:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL (for user management)
- MongoDB (for documents and meetings)
- Backend API (FastAPI)
- Frontend (React + Nginx)

3. **Access the application**:
- Frontend: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs (proxied through nginx)

4. **Default Admin Login**:
- Username: `admin`
- Password: `admin123`

5. **Configure OpenAI API Key**:
   - Log in as admin
   - Go to **Admin > System Settings**
   - Enter your OpenAI API key
   - Save

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild containers (after code changes)
docker-compose up -d --build

# Check service status
docker-compose ps
```

### Environment Variables

You can customize the deployment by setting environment variables. Create a `.env` file in the root directory:

```env
# Security - CHANGE IN PRODUCTION!
SECRET_KEY=your-super-secret-key-change-in-production

# Optional: Override default database credentials
POSTGRES_USER=cxoninja_user
POSTGRES_PASSWORD=cxoninja_password
POSTGRES_DB=cxoninja_users
```

## Development Setup (Without Docker)

If you prefer to run services locally for development:

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=your_user
export POSTGRES_PASSWORD=your_password
export POSTGRES_DB=cxoninja_users
export MONGO_URI=mongodb://localhost:27017
export MONGO_DB=cxoninja_documents
export SECRET_KEY=your-secret-key

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
cxo-ninja/
├── backend/
│   ├── auth/           # Authentication & security
│   ├── database/       # Database connections
│   ├── models/         # SQLAlchemy models (PostgreSQL)
│   ├── routes/         # API endpoints
│   ├── schemas/        # Pydantic schemas
│   ├── services/       # Business logic & OpenAI integration
│   ├── config.py       # Configuration
│   ├── main.py         # Application entry point
│   ├── Dockerfile      # Backend container
│   └── requirements.txt
│
├── frontend/
│   ├── public/         # Static assets
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── store/      # Zustand stores
│   │   ├── types/      # TypeScript types
│   │   ├── App.tsx     # Main app component
│   │   └── main.tsx    # Entry point
│   ├── Dockerfile      # Frontend container
│   ├── nginx.conf      # Nginx configuration
│   └── package.json
│
├── docker-compose.yml  # Container orchestration
└── README.md
```

## Default AI Agents

The system comes with 6 pre-configured AI executives:

| Name | Role | Primary Expertise |
|------|------|-------------------|
| Alexandra Sterling | CFO | Finance (80%), Operations (30%) |
| Marcus Chen | CTO | Technology (90%), Operations (40%) |
| Sarah Mitchell | CPO | Technology (50%), Operations (40%) |
| David Okonkwo | COO | Operations (90%), Logistics (70%) |
| Elena Rodriguez | CHRO | People & HR (90%), Operations (30%) |
| James Thompson | Chief Architect | Technology (80%), Operations (50%) |

## How It Works

1. **User asks a question** to their digital C-Suite
2. **Each hired executive** analyzes the question using their system prompt and expertise weights
3. **Executives form opinions** with reasoning and confidence levels
4. **Chair** synthesizes all opinions into a comprehensive summary
5. **Final recommendation** is presented based on collective wisdom

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Agents
- `GET /api/agents` - List all available agents
- `GET /api/agents/my-board` - Get user's hired agents
- `POST /api/agents/hire/{id}` - Hire an agent
- `POST /api/agents/fire/{id}` - Remove an agent

### Meetings
- `GET /api/meetings` - List user's meetings
- `POST /api/meetings` - Create new meeting (triggers AI deliberation)
- `GET /api/meetings/{id}` - Get meeting details
- `DELETE /api/meetings/{id}` - Delete meeting

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user
- `POST /api/agents/admin` - Create new agent
- `PUT /api/agents/admin/{id}` - Update agent
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update settings

## Mobile Support

The application is a Progressive Web App (PWA) with:
- Responsive design for all screen sizes
- Touch-optimized controls
- Installable on mobile devices
- Offline capability

## Troubleshooting

### Container Issues
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Restart specific service
docker-compose restart backend

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

### Database Connection Issues
- Ensure PostgreSQL and MongoDB containers are healthy: `docker-compose ps`
- Check if ports 5432 and 27017 are not in use by other services

### API Key Issues
- Ensure you've set the OpenAI API key in Admin > System Settings
- Check that the key has sufficient credits

## License

MIT License - feel free to use this for your projects!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
