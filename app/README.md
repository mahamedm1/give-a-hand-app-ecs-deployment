# Give a Hand - Task Exchange Platform

Give a Hand is a community-based task exchange platform where users can trade skills instead of money. This application allows users to post tasks they need help with, swap tasks with other users, and build a community of mutual assistance.

##  Features

- **User Authentication**: Secure signup/login with email verification
- **Task Management**: Create, browse, and manage tasks
- **Task Swapping**: Exchange tasks with other users
- **Messaging System**: In-app communication between users
- **Profile Management**: User profiles with skills and completed tasks
- **Analytics Dashboard**: View task completion statistics
- **Leaderboard**: See top contributors in the community

## Technologies Used

- **Frontend**: React, React Router, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Charting**: Recharts for analytics
- **Icons**: React Icons
- **Build Tool**: [Vite](https://vitejs.dev/)

##  Prerequisites

Before you begin, ensure you have the following installed:


- [VS Code](https://code.visualstudio.com) - Code editor
- [Node.js](https://nodejs.org/) (v16 or newer)
- [npm](https://www.npmjs.com/) - (It comes with Node.js) 
- [Vite](https://vitejs.dev/) - (install it globally with npm install -g vite)
##  Installation

 **Setup Instructions**

1. *Download and Extract*
   Download the project ZIP file and extract it to your desired location.

2. *Open the Folder in VS Code*
    Open Visual Studio Code and select the main project folder

3. *Open the Terminal*
   Go to Terminal > New Terminal in VS Code to open the integrated terminal.


 **Install dependencies**

1. Open File Explorer and navigate to your project folder (e.g., task-helper).

2. Click on the address bar at the top — it will show the full path like:
**C:\Users\maham\Documents\Final Disso\task-helper**

3. Copy it, and in your terminal type:
    ```powershell
    cd "C:\Users\maham\Documents\Final Disso\task-helper"

    ```
   Run the following command in the terminal:

4.  ```powershell
    npm install
    #if high vulnerabilities are present
    npm audit fix
    ```
5.  Start the Development Server
    Run the following to launch the frontend on localhost:

    ```powershell
    npm run dev
    ```
 **Project Structure**
    Your folder should look like this when opened in VS Code:
    task-helper
    ├── node_modules/
    ├── public/
    ├── src/
    ├── .env
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js
    ├── README.md
    ├── tailwind.config.js
    └── vite.config.js

**Key Features**

***Email Verification on Registration***
Users must verify their email address to activate their accounts, adding a layer of security.

***Task Swapping and Matching***
Users can post tasks and exchange help with others — promoting a skill-for-skill economy.

***Community Messaging***
In-app chat system enables users to communicate and coordinate task details.

***Reviews and Feedback***
After completing a task, users can leave reviews to help build trust in the community.

***Leaderboard System***
Highlights top contributors based on task completions.

**PLEASE NOTE**

- During registration, a verification link will be sent to your email.
- Click the link to automatically log in.
- Make sure your local server is running (localhost) when opening the link, or it won't work.



