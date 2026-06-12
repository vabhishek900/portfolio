# Abhishek V Desai — Developer Portfolio

Full-stack portfolio website built with ASP.NET Core 10, SQL Server, and AngularJS.

## Tech Stack

- **Backend:** ASP.NET Core 10 Minimal API, C#, Dapper
- **Database:** SQL Server / Azure SQL (12 tables)
- **Frontend:** AngularJS 1.8.2, Chart.js, CSS3 dark theme
- **Cloud:** Azure App Service, Azure SQL Database
- **Certs:** Azure DP-300, AZ-900

## Features

- 15 REST API endpoints with Swagger UI (`/swagger`)
- Dynamic portfolio data served from SQL Server
- Contact form with rate limiting, honeypot bot protection, email notifications
- Admin dashboard for lead management and testimonial approval (`/admin.html`)
- Skill proficiency radar charts, project industry filters, testimonial carousel

## Run Locally

**Prerequisites:** .NET 10 SDK, SQL Server (local or Docker)

```bash
# 1. Create the database
# Open SSMS → run sql/AbhishekPortfolio_DB_Setup.sql

# 2. Update connection string
# Edit api/appsettings.json → set DefaultConnection to your local SQL Server

# 3. Start the API (serves frontend too)
cd api
dotnet run
```

Open `http://localhost:5164` — frontend and Swagger at `http://localhost:5164/swagger`

## Project Structure

```
AbhishekPortfolio/
├── api/          ASP.NET Core 10 Minimal API
├── Frontend/     AngularJS SPA (index.html, admin.html)
└── sql/          SQL Server schema + seed data
```

## Live Demo

[Portfolio](https://abhishek-portfolio.azurewebsites.net) | [Swagger API](https://abhishek-portfolio.azurewebsites.net/swagger)
