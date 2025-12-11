# cali-urban-modeling-ui

### Frontend Application — Undergraduate Thesis Project

This repository contains the frontend application for the *Cali Computational Modeling* undergraduate thesis project.  
The UI provides visualization tools, configuration panels, and interactive controls to explore the mobility simulation of homeless populations in Santiago de Cali using a Cellular Automata model.

---

## 🚀 Tech Stack
- **React** + **Vite** + **TypeScript**
- **TailwindCSS**
- **Clean Architecture**
- **React Router**
- **React Query**
- **Zustand** (optional global state)
- **ESLint + Prettier**
- **Vitest + React Testing Library**

---

## 📂 Project Structure
The project follows a Clean Architecture structure:

src/
domain/ # Entities, value objects, types
application/ # Use cases, business logic, services
infrastructure/ # API clients, adapters, data sources
presentation/ # UI components, hooks, pages
main.tsx
app.tsx

yaml
Copy code

This ensures separation of concerns, testability, and maintainability.

---

## 🧪 Testing
Unit and component testing powered by **Vitest** and **React Testing Library**.

Run tests:
```bash
npm test
▶ Development
Install dependencies:

bash
Copy code
npm install
Run the development server:

bash
Copy code
npm run dev
Build for production:

bash
Copy code
npm run build
Preview build:

bash
Copy code
npm run preview
```
##📚 **About the Project**
---

This UI is part of a thesis project focused on modeling and simulating mobility behaviors of homeless individuals in Santiago de Cali.
The interface communicates with the Python backend to execute simulations, retrieve grid states, and visualize transitions produced by the Cellular Automata engine.
---

👥 **Authors**
David Gutiérrez

Esteban Ibarra Largo

Systems Engineering — Santiago de Cali, Colombia.

yaml
Copy code
