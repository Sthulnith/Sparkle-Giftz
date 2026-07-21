# Sparkle Giftz Storefront

A luxury gift-box e-commerce store based in **Sri Lanka**. This is a monorepo featuring a React (Vite + TS + Tailwind) frontend and a Spring Boot 3 backend.

## Monorepo Structure

- `/frontend` — React + Vite + TypeScript, Tailwind CSS, React Router, React Query, Axios.
- `/backend` — Spring Boot 3, Java 21, Maven, Flyway, Spring Web, Spring Data JPA, Spring Security (JWT).

## Development Setup

### Database & Environment
You need a Supabase PostgreSQL database connection. Set up your environment variables:
- **Backend:** Create a `.env` or set `DATABASE_URL` (with SSL required).
- **Frontend:** Create `/frontend/.env` with `VITE_API_BASE_URL=http://localhost:8080/api`.

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running the Backend
```bash
cd backend
mvn spring-boot:run
```
