# JiayuL_ProgressReport1

## Work Log

The work log will be updated regularly throughout the project. Each entry will record the actual work completed on that day, together with the time spent and the related project output.

| Date | Number of Hours | Description of Work Done |
|---|---:|---|
| Sep. 22, 2026 | 1 | Reviewed the original invoice project idea and adjusted the project scope. |
| Sep. 22, 2026 | 3 | Worked on the first proposal draft, including the project idea, research questions, architecture, technologies, and evaluation plan. |
| Sep. 23, 2026 | 2 | Discussed the project with the professor and decided to reconsider the original invoice project direction. |
| Sep. 25, 2026 | 3 | Defined the new outdoor trip companion project with Plan, Pack, Explore, and Memory features. Continued writing the proposal. |
| Sep. 26, 2026 | 2 | Set up the backend microservice project structure and local PostgreSQL/PostGIS database using Docker. |
| Sep. 26, 2026 | 2 | Started the User Service implementation, including database migration, user entity, repository, and user profile storage. |
| Sep. 26, 2026 | 1 | Researched Keycloak and set up basic authentication with React and Spring Security. |
| Sep. 26, 2026 | 0.5 | Set up Keycloak with a new realm, React client, PKCE login flow, and test user account. |
| Sep. 26, 2026 | 0.5 | Connected Keycloak authentication with the User Service using Spring Security and JWT validation. Tested protected APIs and automatic user profile creation. |
| Sep. 28, 2026 | 1.5 | Worked on the Gear feature and added APIs to create, view, update, and delete gear items. |
| Sep. 28, 2026 | 0.5 | Added soft delete and made sure users can only manage their own gear. |
| Sep. 28, 2026 | 1 | Improved error handling for invalid requests, authentication, and missing gear items. |
| Sep. 28, 2026 | 1.5 | Added tests for the Gear feature and used Testcontainers with PostgreSQL for integration testing. |
| Sep. 28, 2026 | 0.5 | Fixed some testing issues and checked that all User Service tests passed. |
| Oct. 07, 2026 | 5.5 | Implement trail entity, PostGIS-backed nearby search, filtering, GeoJSON trail details, JWT security, CORS configuration, and demo trail seed data. |
| Oct. 10, 2026 | 3.5 | Implemented a context-aware trail recommendation flow that ranks the top three nearby trails using user intent, weather, gear readiness, scenery preferences, and proximity.|
| Oct. 11, 2026 | 2.0 | Used Kling AI to generate cinematic outdoor video assets for the public landing page.|
| Oct. 11, 2026 | 3.0 |  Set up and used a Claude multi-agent workflow to coordinate UI/UX design, frontend implementation, and QA for the project.|

## Summary 

### Backend

- Completed the user-service, integrated with Keycloak and Spring Security for register/authentication and user identity access management.
- Learned how Keycloak works as an external identity provider and how authenticated user information can be passed to backend microservices.
- Completed the trail-service, including define the trail entity in database, and CRUD for the trail data.
- Learned how to use PostgreSQL/PostGIS to store geographic data and perform spatial queries, such as finding nearby trails based on location and distance.

### Frontend
- Set up Claude AI with a multi-agent development workflow, where a PM agent leads the UI/UX, frontend, backend, and QA agents during feature development.
- Used the multi-agent workflow to support the initial frontend design and implementation process while keeping tasks separated by role and scope.
- Created visual assets for the homepage hero section using ChatGPT image generation.
- Converted the generated images into short 5-second animated videos using Kling AI, adding more movement and visual variety to the homepage.

## AI Use Section

### AI Usage

| **AI Tool Name** | **Version, Account Type** | **Specific feature for which the AI tool was used** | **Value Addition**<br>***What value did you add over and above what AI did for you? In your own words*** |
| ---------------- | ------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Claude AI** | Claude Code, Pro| Used to support frontend development through a multi-agent workflow, including PM, UI/UX, frontend, backend, and QA roles. | I defined the project requirements, architecture, feature scope, and design constraints. I reviewed the generated implementation, selected appropriate solutions, corrected issues, and integrated the final code into my existing backend and frontend architecture. |
| **ChatGPT** | ChatGPT Plus | Used to brainstorm homepage concepts and generate image prompts/assets for the homepage hero section. | I designed the overall visual direction, selected the outdoor scenarios, adjusted composition and animation ideas, and iterated on the generated results to make them consistent with the project theme and UI design. |
| **Kling AI** | Web Version | Used to convert static homepage images into short 5-second animated video clips. | I selected the source images, designed the motion for each scene, wrote and refined animation prompts, reviewed the generated videos, and adjusted the scenes when the movement or visual result did not match the intended user experience. |
