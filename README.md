# RoadGuard

A comprehensive roadside assistance and automotive service management platform connecting end users, mechanics, and workshops.

## Video Demo
https://drive.google.com/file/d/1rtpdXJjvFPdaqTCuypw4j5ITzmIVK116/view?usp=sharing

## Features

### Core Functionality
- **Service Request Management**: End users can request automotive services with real-time location tracking
- **Workshop Management**: Workshop admins manage mechanics, service requests, and business operations
- **Mechanic Dashboard**: Field mechanics receive assignments and update service status
- **Live Location Integration**: GPS-based location capture with SerpAPI integration for finding nearby mechanics
- **Real-time Updates**: WebSocket-powered live notifications and status updates

### User Roles
- **End Users**: Request services, track progress, communicate with mechanics
- **Workshop Admins**: Manage workshops, assign mechanics, oversee operations
- **Mechanics**: Receive assignments, update service status, communicate with customers
- **Super Admins**: Platform administration and oversight

## Technology Stack

### Backend
- **Framework**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with role-based access control
- **Real-time**: Socket.io for live updates
- **APIs**: SerpAPI for location services, Google Maps integration

### Frontend
- **Framework**: React with TypeScript
- **UI Library**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Routing**: React Router
- **Maps**: Google Maps API

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Google Maps API key
- SerpAPI key

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure environment variables
npm run db:migrate
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Configure environment variables
npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/roadguard_db"
JWT_SECRET="your-jwt-secret"
PORT=5000
FRONTEND_URL="http://localhost:5173"
GOOGLE_MAPS_API_KEY="your-google-maps-key"
SERP_API_KEY="your-serp-api-key"
EMAIL_USER="your-email"
EMAIL_PASS="your-email-password"
```

### Frontend (.env.local)
```
VITE_API_URL="http://localhost:5000/api"
VITE_GOOGLE_MAPS_API_KEY="your-google-maps-key"
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Service Requests
- `GET /api/services` - List service requests
- `POST /api/services` - Create service request
- `GET /api/services/:id` - Get service details
- `PUT /api/services/:id/status` - Update service status

### Mechanics
- `GET /api/mechanics/nearby` - Find nearby mechanics using SerpAPI
- `GET /api/mechanics/search` - Advanced mechanic search

### Workshops
- `GET /api/workshops/nearby` - Find nearby workshops
- `POST /api/workshops` - Create workshop
- `GET /api/workshops/mechanics` - Get workshop mechanics

## Database Schema

### Key Models
- **User**: Base user entity with role-based access
- **Workshop**: Service provider locations
- **Mechanic**: Field service technicians
- **ServiceRequest**: Customer service requests
- **ServiceUpdate**: Real-time status updates

## Development

### Database Operations
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

### Testing
```bash
npm test            # Run test suite
npm run test:watch  # Watch mode
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Submit pull request

## License

This project is licensed under the MIT License.
