# BCA External Examiner Allotment System

## Overview
This project is developed by the students of BCA at Bangalore University (BU). It aims to streamline the allotment of external examiners for BCA lab exams across colleges under BU. The system ensures fair distribution of examiners based on multiple parameters like residential address, college location, and the number of students.

## Features
1. **Data Collection Module** - Gather faculty details and availability.
2. **Update Faculty Availability** - Teachers can update their availability status.
3. **Smart Allotment** - Assign external examiners based on:
   - Residential address (using the pincode of colleges and faculties).
   - Number of students in the college.
4. **Contribution Tracking** - Maintain records of colleges contributing faculties as examiners.
5. **Performance Analysis** - Identify best-performing colleges in this regard.
6. **Daily Updates** - Monitor faculty availability in real-time.
7. **Visit Records** - Enable colleges to log the time of visit of external examiners.
8. **Non-Contributing Colleges** - Track colleges that avoid sending faculties as examiners.

## Tech Stack
- **Backend:** Node.js (Express.js)
- **Frontend:** EJS (Embedded JavaScript)
- **Database:** MySQL

## Installation
### Prerequisites
Ensure you have the following installed:
- Node.js
- MySQL Server

### Steps to Run Locally
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/examiner-allotment.git
   cd examiner-allotment
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up MySQL database:
   - Create a database in MySQL.
   - Import the provided SQL file (if available).
   - Update database credentials in `.env` file.

4. Start the server:
   ```sh
   npm start
   ```
5. Open the application in your browser at:
   ```
   http://localhost:3000
   ```

## Folder Structure
```
📂 examiner-allotment
├── 📂 views        # EJS Templates
├── 📂 routes       # Express route handlers
├── 📂 models       # Database models (MySQL)
├── 📂 public       # Static files (CSS, JS)
├── server.js      # Main server file
└── README.md
```

## API Endpoints
### Faculty Endpoints
- `POST /faculty/register` - Register a new faculty member.
- `GET /faculty/availability` - Get availability status of all faculty.
- `PUT /faculty/update/:id` - Update faculty availability.

### Allotment Endpoints
- `POST /allotment/assign` - Assign an external examiner.
- `GET /allotment/status` - Check current allotment status.

### College Endpoints
- `POST /college/register` - Register a college.
- `GET /college/performance` - Fetch best-performing colleges.
- `GET /college/non-compliant` - Fetch non-contributing colleges.

## Contributing
If you'd like to contribute, please fork the repository and submit a pull request.

## License
This project is open-source and available under the [MIT License](LICENSE).

## Contact
For any queries, feel free to contact the project maintainers at:
- **Email:** your-email@example.com
- **GitHub Issues:** [Open an issue](https://github.com/yourusername/examiner-allotment/issues)

---
This project is being actively developed and maintained by students of BCA at Bangalore University.

