# Project Management Tool

A full stack web application that I built as part of my internship at CodeAlpha. The idea was to create something similar to Trello where teams can manage their projects and tasks together in real time.

## Why I Built This

During the internship I was assigned Task 3 which was to build a collaborative project management tool. I wanted to go beyond just basic CRUD and actually implement real time updates so that when one team member moves a task, everyone else sees it instantly without refreshing the page.

## What It Does

You can create an account and log in securely. Once inside you can create multiple projects and invite members to join them. Each project has a Kanban board with four columns — To Do, In Progress, Review, and Done. You can create tasks, assign them to team members, set priorities and due dates, and leave comments inside each task to communicate with your team.

The real time part was the most interesting to implement. I used Socket.io so that any change made by one user — like creating a task or moving it to a different column — instantly appears on everyone else's screen who has the same project open.

## Tech Stack

I used Node.js and Express for the backend because I wanted to learn how REST APIs work in practice. MongoDB with Mongoose handles all the data. For authentication I implemented JWT tokens with bcrypt for password hashing. Socket.io handles the real time WebSocket connections. The frontend is plain HTML, CSS and JavaScript without any framework since I wanted to understand the fundamentals first.

## Project Structure

```
project-management-tool/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   └── Comment.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   └── comments.js
│   └── server.js
└── frontend/
    ├── index.html
    ├── dashboard.html
    ├── board.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        ├── auth.js
        ├── dashboard.js
        └── board.js
```

## How to Run Locally

Make sure you have Node.js and MongoDB installed on your machine.

Clone the repository and go into the backend folder. Create a .env file by copying .env.example and fill in your MongoDB connection string and a JWT secret key.

```
cd backend
npm install
cp .env.example .env
npm run dev
```

Then open the frontend folder and launch index.html in your browser. If you have VS Code you can use the Live Server extension for a better experience.

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Login and get token |
| GET | /api/projects | Get all my projects |
| POST | /api/projects | Create a project |
| GET | /api/tasks/:projectId | Get tasks for a project |
| POST | /api/tasks | Create a task |
| PUT | /api/tasks/:id | Update task status etc |
| POST | /api/comments | Add comment to a task |

## What I Learned

Working on this project taught me a lot about how authentication actually works under the hood. Implementing JWT from scratch gave me a much better understanding than just reading about it. Socket.io was completely new to me and figuring out the room based broadcasting for project specific updates was a good challenge. I also got better at structuring a backend project with separate models, routes and middleware.

## Features

- User registration and login with JWT authentication
- Create and manage multiple projects
- Kanban board with drag and drop style status updates
- Task assignment, priority levels and due dates
- Comments section inside each task
- Real time updates using WebSockets so the whole team stays in sync
- Clean dark themed UI that works on different screen sizes

---

Made with lots of debugging and coffee during my CodeAlpha internship.
