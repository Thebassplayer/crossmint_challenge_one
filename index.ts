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

type Position = { row: string; column: string };
type AstralObjectRequest = {
  method: string;
  headers: Record<string, string>;
  body: string;
};

type Polyanet = {
  row: string;
  column: string;
  candidateId: string;
};

type Soloon = {
  row: string;
  column: string;
  candidateId: string;
  color: "blue" | "red" | "purple" | "white";
};

type Cometh = {
  row: string;
  column: string;
  candidateId: string;
  direction: "up" | "down" | "right" | "left";
};

const retry = async <T>(
  action: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> => {
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await action();
    } catch (error) {
      console.error(error);
      console.log(`Attempt ${attempt} failed. Retrying...`);
    }

    attempt++;
  }

  throw new Error(`Max retries reached. Failed after ${maxAttempts} attempts.`);
};

const fetchAstralObject = async (
  objectType: string,
  url: string,
  request: AstralObjectRequest,
  res: express.Response
): Promise<void> => {
  try {
    await retry(async () => {
      const response = await fetch(url, request);

      if (response.ok) {
        res
          .status(200)
          .json({ message: `${objectType} operation successful.` });
      } else {
        res.status(response.status).json({ error: response.statusText });
        throw new Error(`Request failed with status ${response.status}`);
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const createAstralObject = async (
  objectType: string,
  position: Position,
  res: express.Response,
  req: express.Request
): Promise<void> => {
  const url = `${API_BASE_URL}/${objectType}`;
  let body: string;

  switch (objectType) {
    case "polyanets":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Polyanet);
      break;
    case "soloons":
      const color = req.body.color;
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
        color,
      } as Soloon);
      break;
    case "comeths":
      const direction = req.body.direction;
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
        direction,
      } as Cometh);
      break;
    default:
      throw res.status(400).json({ error: "Invalid astral object type." });
  }

  const request: AstralObjectRequest = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  };

  await fetchAstralObject(objectType, url, request, res);
};

const deleteAstralObject = async (
  objectType: string,
  position: Position,
  res: express.Response
): Promise<void> => {
  const url = `${API_BASE_URL}/${objectType}`;
  let body: string;

  switch (objectType) {
    case "polyanets":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Polyanet);
      break;
    case "soloons":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Soloon);
      break;
    case "comeths":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Cometh);
      break;
    default:
      throw res.status(400).json({ error: "Invalid astral object type." });
  }

  const request: AstralObjectRequest = {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body,
  };

  await fetchAstralObject(objectType, url, request, res);
};

const resetMap = async (
  res: express.Response,
  delayBetweenRequests: number = 1000
): Promise<void> => {
  const url = `${API_BASE_URL}/polyanets`;

  try {
    // 11x11 spaces map
    const rows = 11;
    const columns = 11;

    // Iterate over all spaces and add delete requests to the batch
    for (let row = 0; row <= rows - 1; row++) {
      for (let column = 0; column <= columns - 1; column++) {
        const body = JSON.stringify({
          row: String(row),
          column: String(column),
          candidateId: CANDIDATE_ID,
        } as Polyanet);

        const request: AstralObjectRequest = {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body,
        };

        console.log(`Sending request to ${url} with body:`, body);

        try {
          const response = await fetch(url, request);

          if (!response.ok) {
            console.error(`Request failed with status ${response.status}`);
            res
              .status(response.status || 500)
              .json({ error: response.statusText || "Internal Server Error" });
            return;
          }

          console.log(`Request to ${url} successful.`);

          // Introduce a delay between requests only if the current request is successful
          if (delayBetweenRequests > 0 && row < rows - 1) {
            await new Promise(resolve =>
              setTimeout(resolve, delayBetweenRequests)
            );
          }
        } catch (error) {
          console.error(`Error sending request: ${error.message}`);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
      }
    }

    res.status(200).json({ message: "Map reset successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Endpoint to create an astral object
app.post("/api/:objectType", (req, res) => {
  const { objectType } = req.params;
  const { row, column } = req.body;
  createAstralObject(objectType, { row, column }, res, req);
});

// Endpoint to delete an astral object
app.delete("/api/:objectType", (req, res) => {
  const { objectType } = req.params;
  const { row, column } = req.body;
  deleteAstralObject(objectType, { row, column }, res);
});

// Endpoint to reset the map
app.delete("/api/reset-map", (req, res) => {
  resetMap(res);
});

// Endpoint to handle bulk create and delete operations

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
