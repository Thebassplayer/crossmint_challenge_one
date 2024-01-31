import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const API_BASE_URL = process.env.API_BASE_URL;
const CANDIDATE_ID = process.env.CANDIDATE_ID;

// Function to create a Polyanet
app.post("/api/polyanets", async (req, res) => {
  const { row, column } = req.body;
  const url = `${API_BASE_URL}polyanets`;
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
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to delete a Polyanet
app.delete("/api/polyanets", async (req, res) => {
  const { row, column } = req.body;
  const url = `${API_BASE_URL}polyanets?row=${row}&column=${column}&candidateId=${CANDIDATE_ID}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
