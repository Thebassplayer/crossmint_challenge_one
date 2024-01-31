import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const API_BASE_URL = process.env.API_BASE_URL;
const CANDIDATE_ID = process.env.CANDIDATE_ID;

// Function to create a Polyanet
app.post("/api/polyanets", async (req, res) => {
  const { row, column } = req.body;
  const url = `${API_BASE_URL}/polyanets`;
  const body = { row, column, candidateId: CANDIDATE_ID };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      res.status(200).json({ message: "Polyanet created successfully." });
    } else {
      res.status(response.status).json({ error: response.statusText });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to delete a Polyanet
app.delete("/api/polyanets", async (req, res) => {
  const { row, column } = req.body;
  const url = `${API_BASE_URL}/polyanets`;
  const body = { row, column, candidateId: CANDIDATE_ID };

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      res.status(200).json({ message: "Polyanet deleted successfully." });
    } else {
      res.status(response.status).json({ error: response.statusText });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Reset the map
app.delete("/api/reset-map", async (req, res) => {
  const url = `${API_BASE_URL}/polyanets`;
  try {
    // Assuming your map has 11x11 spaces
    const rows = 11;
    const columns = 11;

    // Array to store batch delete requests
    const batchRequests = [];

    // Iterate over all spaces and add delete requests to the batch
    for (let row = 1; row <= rows; row++) {
      for (let column = 1; column <= columns; column++) {
        const body = {
          row: String(row),
          column: String(column),
          candidateId: CANDIDATE_ID,
        };

        batchRequests.push({
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      }
    }

    // Use Promise.all to send all delete requests in parallel
    const responses = await Promise.all(
      batchRequests.map(request => fetch(url, request))
    );

    // Check responses and handle errors if needed
    for (const response of responses) {
      if (!response.ok) {
        res.status(response.status).json({ error: response.statusText });
        return;
      }
    }

    res.status(200).json({ message: "Map reset successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to handle bulk create and delete operations
app.post("/api/polyanets/batch", async (req, res) => {
  const bulkData = req.body;

  try {
    for (const item of bulkData) {
      const { type, data } = item;

      if (type === "createPolyanet") {
        const { row, column } = data;
        const url = `${API_BASE_URL}/polyanets`;
        const body = { row, column, candidateId: CANDIDATE_ID };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          res.status(response.status).json({ error: response.statusText });
          return;
        }
      } else if (type === "deletePolyanet") {
        const { row, column } = data;
        const url = `${API_BASE_URL}/polyanets`;
        const body = { row, column, candidateId: CANDIDATE_ID };

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          res.status(response.status).json({ error: response.statusText });
          return;
        }
      } else {
        res.status(400).json({ error: "Invalid operation type" });
        return;
      }
    }

    res
      .status(200)
      .json({ message: "Batch operations completed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
