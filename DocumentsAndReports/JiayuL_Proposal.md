# CSIS 4495 Project Proposal

## AI-Powered Outdoor Trip Companion
### Personalized Hiking Planning, Packing Assistance, Live Trail Activity, and Trip Memory Generation

---

**Student:** Jiayu Lou 
**Student ID:** 300398003 
**Course:** CSIS 4495 – Applied Research Project 
**Section:** 002 
**Team Lead:** Jiayu Lou 
**Project Type:** Individual Project 

<div style="page-break-after: always;"></div>


# 1. Introduction

Outdoor activities such as hiking are very popular in Vancouver and it's my favourite activity in my spare time. However, planning a hiking trip usually requires users to check information from different websites or applications. For example, users may need to check the trail information, weather forecast, driving distance, and their own equipment separately before deciding where to go.

For people who are not very familiar with the local trails, this process can take more time. Weather is also an important factor for outdoor activities. A trail may be suitable in good weather but may become less suitable when there is heavy rain, snow, strong wind, or low temperature. Because of this, only searching for a trail based on difficulty or popularity may not always give a suitable recommendation.

This project proposes an AI-powered web application for outdoor trip planning and experience. The main concept of the application is:

**Plan → Pack → Explore → Memory**

In the **Plan** stage, users can communicate with an AI assistant and describe what kind of hiking trip they want. The user may provide information such as difficulty, available time, travel distance, and preferred scenery. The system will also use weather information around Vancouver to recommend suitable trails.

In the **Pack** stage, users can create and manage their own outdoor gear and clothing list. Based on the selected trail and weather conditions, the system can suggest which items the user may need to bring. The purpose is to make the packing recommendation more personalized instead of only providing a general checklist.

In the **Explore** stage, users can view a map showing hiking activity on different trails. The map can show which trails currently have active hikers and the approximate number of users on each trail. Since it may not be possible to collect enough real-time data from real hikers during this project, simulated user location data can be used to demonstrate this feature.

In the **Memory** stage, users can upload their GPS track and photos after completing a trip. The system can use this information to create a trip recap, such as a summary page or a short video that shows the route, photos, and some basic trip information.

The main research focus of this project is how different types of information can be combined to provide better outdoor trip recommendations. These information sources may include user preferences, trail information, weather conditions, and the user's own equipment. One research question for this project is:

The expected benefit of this project is to provide a single web application that can support different stages of an outdoor trip. It can also provide an opportunity to research the use of AI, real-time information, weather data, location data, and multimedia processing in one practical web application.

---

# 2. Proposed Research Project

## 2.1 Research Objectives

The main objective of this project is to design and develop a web application that can support users during different stages of an outdoor hiking trip.

The project has four main objectives:

1. Develop an AI-assisted hiking recommendation function that can consider user preferences, trail information, and weather conditions.
2. Develop a personalized packing assistant based on the selected trail, weather conditions, and the user's own outdoor equipment.
3. Develop a map-based feature to show current hiking activity on different trails by using simulated user location data.
4. Develop a trip memory feature that can use uploaded GPS tracks and photos to create a trip summary or a simple trip recap video.

The main research focus will be on the first two objectives, especially how different information can be combined to provide more useful and personalized recommendations.

---

## 2.2 Research Design and Methodology

The project will use a design and implementation approach. The system will first collect different types of information and then use them together to generate recommendations.

For the hiking recommendation function, the system will consider information such as:

- hiking difficulty
- available time
- travel distance
- preferred scenery
- trail distance and elevation
- weather forecast
- temperature
- rain or snow conditions

The user can describe their needs through a conversation with an AI assistant. The AI will help convert the user's natural language request into more structured information. The system can then use this information to search and compare available trails.

The recommendation should not only depend on the AI language model. Some important conditions, such as trail difficulty, trip duration, or weather risk, can also be checked by the backend system before the recommendation is returned to the user.

For the packing assistant, users will first create a list of outdoor gear and clothes that they own. The system will then use the selected trail and weather information to provide a packing suggestion. For example, if the forecast shows rain and the user owns a rain jacket, the system may recommend bringing the rain jacket.

For the Explore feature, the project will use simulated location data instead of requiring a large number of real hikers. The simulated users can be assigned to different trails and their locations can be updated over time. The web application can then display the number of active users and their approximate positions on the map.

For the Memory feature, users can upload a GPS track and photos after the trip. The system will try to combine the route, trip information, and photos to create a simple trip summary. If there is enough development time, a short automatically generated video can also be created.

---

## 2.3 Data Collection

The project will use several types of data.

### Trail Data

Trail data will mainly be collected from publicly available geographic
data sources such as **OpenStreetMap**. For the prototype, the project will
focus on a limited number of hiking trails around Vancouver.

The trail data may include:

- trail name
- location
- route coordinates
- distance
- elevation gain
- difficulty
- estimated duration
- scenery type
- basic description

Geographic information such as trail routes and coordinates may be
obtained from OpenStreetMap, while some additional trail attributes may
be calculated or manually prepared for the research dataset.

### Weather Data

Weather forecast data will be collected from the Open-Meteo API. Open-Meteo is selected because it provides free weather forecast data
for non-commercial and educational use and supports location-based
queries using latitude and longitude.

The system will query weather information based on the geographic
coordinates of each trail. The weather data may include:

- temperature
- precipitation probability
- precipitation
- wind speed
- general weather conditions
- forecast date and time

The weather information will be combined with trail information and
user preferences when generating hiking recommendations.

For example, if a user prefers to avoid rain, trails with a high
probability of precipitation may receive a lower recommendation score.


### User Preference Data

For testing the recommendation system, approximately 30 different hiking request scenarios will be created.

Example scenarios may include:

- beginner user looking for a short hike
- experienced user looking for a difficult hike
- user who wants mountain views
- user who wants to avoid rain
- user with limited available time
- user who does not have some specific outdoor equipment

These scenarios will be used to test whether the system can correctly understand the user's requirements and provide suitable recommendations.

### Simulated Location Data

For the live trail activity feature, simulated users will be generated and assigned to several hiking trails.

For example, the system may simulate 20 to 50 users moving on different trails. This data will be used to demonstrate how the map can display active hiking activity without requiring real users to continuously share their GPS locations.

---

## 2.4 Project Deliverables

The main deliverable will be a working web application.

The application will include the following main functions:

### Plan

Users can communicate with an AI assistant and receive hiking recommendations based on their preferences, trail information, and weather conditions.

### Pack

Users can manage their own outdoor equipment and receive personalized packing suggestions for a selected trip.

### Explore

Users can view hiking trails on a map and see simulated active hikers or the number of active users on each trail.

### Memory

Users can upload GPS tracks and photos to create a trip summary. A simple video generation function may be implemented as an additional feature if time allows.

---

## 2.5 Technologies


The current planned technologies for this project are:

| Area | Technology |
|---|---|
| Platform | Web Application / Cloud |
| Frontend | React, TypeScript |
| Backend | Java 21, Spring Boot |
| Database | PostgreSQL, DynamoDB |
| AI | OpenAI API |
| Trail Data | OpenStreetMap, Overpass API |
| Weather Data | Open-Meteo API |
| Map | Leaflet, OpenStreetMap |
| Location Data | GPS / GPX data |
| Real-Time Updates | Spring WebSocket |
| Media Storage | Amazon S3 |
| Video / Trip Recap | GPX processing, FFmpeg (if time allows) |
| Deployment | AWS |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| Source Control | GitHub |

---

## 2.6 Expected Results

The expected result is a working prototype that demonstrates how AI and different external data sources can support outdoor trip planning.

The system is expected to provide hiking recommendations that are more personalized than simply searching trails by popularity or difficulty.

For example, two users may receive different recommendations because they have different hiking experience, available time, preferred scenery, or outdoor equipment.

The packing assistant is also expected to provide more useful suggestions because it can consider both the weather and the equipment that the user already owns.

The Explore feature is expected to demonstrate how live outdoor activity can be visualized on a web map using simulated location data.

The Memory feature is expected to show how GPS track data and photos can be used together to create a more organized record of a completed hiking trip.

---

# 3. Project Planning and Timeline

The project will be developed over approximately 13 weeks. The timeline is mainly based on functional deliverables.

| Week | Deliverable |
|---|---|
| Week 1 | Basic web application setup with React frontend and Spring Boot backend |
| Week 2 | User registration, login, and basic user profile |
| Week 3 | Trail database with PostgreSQL/PostGIS and initial Vancouver-area trail dataset |
| Week 4 | Interactive trail map using Leaflet and OpenStreetMap |
| Week 5 | Open-Meteo weather integration for selected trail locations |
| Week 6 | AI chat interface for collecting user hiking preferences |
| Week 7 | Hiking recommendation feature using user preferences, trail data, and weather information |
| Week 8 | User gear and clothing inventory management |
| Week 9 | AI packing recommendation based on selected trail, weather, and user-owned equipment |
| Week 10 | Explore feature showing active hikers on trails using simulated location data |
| Week 11 | DynamoDB integration for temporary hiking activity data and map updates |
| Week 12 | GPX upload, route parsing, photo upload, and trip recap page |
| Week 13 | Final integration, AWS deployment, testing, bug fixing, and final demonstration |

## Major Functional Deliverables

The final system is expected to include the following deliverables:

1. **Plan**
   - AI conversation interface
   - Hiking preference extraction
   - Trail and weather integration
   - Personalized trail recommendation

2. **Pack**
   - User gear and clothing inventory
   - Personalized packing recommendation

3. **Explore**
   - Interactive hiking map
   - Simulated active hikers
   - Trail activity visualization

4. **Memory**
   - GPX file upload and parsing
   - Photo upload
   - Automatically generated trip recap page
   - Simple recap video generation if time allows

5. **Deployment**
   - Dockerized application
   - AWS deployment
   - GitHub source repository
   - CI/CD pipeline using GitHub Actions

---

## 4. AI Use Section

AI tools will be used during the project for research support, software development, debugging, documentation, and design discussion. AI-generated outputs will be reviewed and validated before they are included in the project.

| AI Tool Name         | Version / Account Type                         | Specific Feature / Use                                       | Value Addition by Student                                    |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| ChatGPT              | GPT-5.6 Sol / ChatGPT Plus                     | Used for project brainstorming, architecture discussion, research-question refinement, technical explanations and proposal drafting. And gramma check. | I defined the original business problem and project scope based on my work experience. I reviewed and modified the proposed architecture, selected the technologies, refined the research methodology, and verified that the solution is realistic for the project. |

---

## 5. Work Date / Hours Log

**Student Name:** Jiayu Lou

The work log will be updated regularly throughout the project. Each entry will record the actual work completed on that day, together with the time spent and the related project output.

| Date | Number of Hours | Description of Work Done |
|---|---:|---|
| Sep. 22, 2026 | 1 | Refined the initial project topic and scope from a general invoice-processing application into a cloud-native distributed invoice-processing platform with agentic validation. |
| Sep. 22, 2026 | 3 | Drafted and revised the initial proposal, including the system architecture, research questions, validation workflow, technology stack, evaluation plan, project scope, and optional Outlook integration. |
| Sep. 23, 2026 | 2 | Discussed the project direction and scope with the professor. Reconsidered the original invoice-processing topic and explored alternative project ideas. |
| Sep. 25, 2026 | 3 | Defined the new outdoor trip companion project around the Plan, Pack, Explore, and Memory stages. Drafted the project proposal, including research objectives, data sources, technologies, evaluation methods, and project timeline. |

